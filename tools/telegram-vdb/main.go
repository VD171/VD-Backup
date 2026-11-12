package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/telegram/downloader"
	"github.com/gotd/td/telegram/uploader"
	"github.com/gotd/td/tg"
)

const (
	AppID   = 2040
	AppHash = "b18441a1ff607e10a989891a5462e627"
)

type AuthStaging struct {
	Phone         string `json:"phone"`
	PhoneCodeHash string `json:"phone_code_hash"`
}

type TelegramDest struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Title        string `json:"title"`
	ChannelID    string `json:"channel_id"`
	ChannelRawID int64  `json:"channel_raw_id,omitempty"`
	AccessHash   int64  `json:"access_hash,omitempty"`
	ChannelTitle string `json:"channel_title"`
	UserID       int64  `json:"user_id,omitempty"`
	UserName     string `json:"user_name,omitempty"`
	UserPhone    string `json:"user_phone,omitempty"`
	CreatedAt    string `json:"created_at,omitempty"`
}

func getStateDir() string {
	if s := os.Getenv("VDBACKUP_STATE"); s != "" {
		return s
	}
	return "/data/adb/vdbackup"
}

func getSessionPath() string {
	return filepath.Join(getStateDir(), "creds", "telegram.session")
}

func getStagingPath() string {
	return filepath.Join(getStateDir(), "staging", "tg_auth.json")
}

func getDestPath() string {
	return filepath.Join(getStateDir(), "dests", "telegram.json")
}

func normalizePhone(p string) string {
	var sb strings.Builder
	for _, r := range p {
		if r >= '0' && r <= '9' {
			sb.WriteRune(r)
		}
	}
	res := sb.String()
	res = strings.TrimPrefix(res, "00")
	return res
}

func printJSON(v any) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}

func printError(code, msg string) {
	printJSON(map[string]any{
		"ok":      false,
		"code":    code,
		"message": msg,
	})
}

func generateRandomChannelName() string {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	mode := rng.Intn(3)
	switch mode {
	case 0:
		animals := []string{"Cat", "Dog", "Fox", "Bear", "Wolf", "Owl", "Hawk", "Lion", "Tiger", "Panda"}
		sounds := []string{"meow", "bark", "roar", "chirp", "howl", "growl", "purr", "whistle"}
		return fmt.Sprintf("%s_%s_VDB", animals[rng.Intn(len(animals))], sounds[rng.Intn(len(sounds))])
	case 1:
		num := 10000000 + rng.Int63n(90000000)
		return fmt.Sprintf("%d_VDB", num)
	default:
		letters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		var b strings.Builder
		for i := 0; i < 6; i++ {
			b.WriteByte(letters[rng.Intn(len(letters))])
		}
		sep := "_"
		if rng.Intn(2) == 1 {
			sep = "-"
		}
		return fmt.Sprintf("%s%sVDB", b.String(), sep)
	}
}

func isVDBChannel(title string) bool {
	t := strings.TrimSpace(title)
	if strings.HasSuffix(t, "VDB") || strings.HasSuffix(t, "_VDB") || strings.HasSuffix(t, "-VDB") {
		return true
	}
	if strings.HasPrefix(t, "VD_Backup_") || strings.HasPrefix(t, "VD_") {
		return true
	}
	return false
}

func createClient() (*telegram.Client, error) {
	sessPath := getSessionPath()
	if err := os.MkdirAll(filepath.Dir(sessPath), 0700); err != nil {
		return nil, err
	}
	storage := &session.FileStorage{Path: sessPath}

	opts := telegram.Options{
		SessionStorage: storage,
		Device:         telegram.DeviceTDesktopWindows(),
		Resolver:       telegram.TDesktopResolver(),
	}
	return telegram.NewClient(AppID, AppHash, opts), nil
}

func findStorageChannel(ctx context.Context, api *tg.Client) (*tg.Channel, error) {
	dialogs, err := api.MessagesGetDialogs(ctx, &tg.MessagesGetDialogsRequest{
		OffsetPeer: &tg.InputPeerEmpty{},
		Limit:      100,
	})
	if err != nil {
		return nil, err
	}

	if mod, ok := dialogs.AsModified(); ok {
		for _, chat := range mod.GetChats() {
			if ch, ok := chat.(*tg.Channel); ok {
				if isVDBChannel(ch.Title) {
					return ch, nil
				}
			}
		}
	}
	return nil, nil
}

func saveDestConfig(ch *tg.Channel, user *tg.User) error {
	fullID := fmt.Sprintf("-100%d", ch.ID)
	dest := TelegramDest{
		ID:           "telegram",
		Type:         "telegram",
		Title:        "Telegram Storage",
		ChannelID:    fullID,
		ChannelRawID: ch.ID,
		AccessHash:   ch.AccessHash,
		ChannelTitle: ch.Title,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	if user != nil {
		dest.UserID = user.ID
		dest.UserName = user.FirstName
		dest.UserPhone = user.Phone
	}
	data, err := json.MarshalIndent(dest, "", "  ")
	if err != nil {
		return err
	}
	p := getDestPath()
	if err := os.MkdirAll(filepath.Dir(p), 0700); err != nil {
		return err
	}
	return os.WriteFile(p, data, 0600)
}

func loadDestConfig() (*TelegramDest, error) {
	p := getDestPath()
	data, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	var d TelegramDest
	if err := json.Unmarshal(data, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

func updateProgress(opid, phase, item string, percent int) {
	if opid == "" {
		return
	}
	f := filepath.Join(getStateDir(), "logs", fmt.Sprintf("progress-%s.json", opid))
	m := map[string]any{
		"opid":    opid,
		"percent": percent,
		"phase":   phase,
		"item":    item,
		"done":    false,
	}
	data, err := json.Marshal(m)
	if err == nil {
		_ = os.WriteFile(f, data, 0644)
	}
}

func parseChannelInputPeer(dest *TelegramDest, destID string, ctx context.Context, api *tg.Client) (tg.InputPeerClass, error) {
	if dest != nil && dest.ChannelRawID != 0 && dest.AccessHash != 0 {
		return &tg.InputPeerChannel{
			ChannelID:  dest.ChannelRawID,
			AccessHash: dest.AccessHash,
		}, nil
	}

	dialogs, err := api.MessagesGetDialogs(ctx, &tg.MessagesGetDialogsRequest{
		OffsetPeer: &tg.InputPeerEmpty{},
		Limit:      100,
	})
	if err != nil {
		return nil, err
	}

	var targetID int64
	cleanID := strings.TrimPrefix(destID, "-100")
	cleanID = strings.TrimPrefix(cleanID, "-")
	if id, err := strconv.ParseInt(cleanID, 10, 64); err == nil && id > 0 {
		targetID = id
	}

	if mod, ok := dialogs.AsModified(); ok {
		var matched *tg.Channel
		for _, chat := range mod.GetChats() {
			if ch, ok := chat.(*tg.Channel); ok {
				if targetID != 0 && ch.ID == targetID {
					matched = ch
					break
				}
				if isVDBChannel(ch.Title) && matched == nil {
					matched = ch
				}
			}
		}

		if matched != nil {
			_ = saveDestConfig(matched, nil)
			return &tg.InputPeerChannel{
				ChannelID:  matched.ID,
				AccessHash: matched.AccessHash,
			}, nil
		}
	}

	return nil, errors.New("storage channel not found")
}

func computeSHA256(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// Subcommand Handlers

func cmdSendCode(phone string) {
	phone = normalizePhone(phone)
	if phone == "" {
		printError("ERR_INVALID_PHONE", "Phone number is required")
		return
	}
	client, err := createClient()
	if err != nil {
		printError("ERR_CLIENT", err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	err = client.Run(ctx, func(ctx context.Context) error {
		res, err := client.Auth().SendCode(ctx, phone, auth.SendCodeOptions{})
		if err != nil {
			return err
		}
		var codeHash string
		switch v := res.(type) {
		case *tg.AuthSentCode:
			codeHash = v.PhoneCodeHash
		case *tg.AuthSentCodeSuccess:
			// Already authorized
		default:
			return fmt.Errorf("unexpected send code response: %T", res)
		}

		staging := AuthStaging{
			Phone:         phone,
			PhoneCodeHash: codeHash,
		}
		sData, _ := json.Marshal(staging)
		_ = os.MkdirAll(filepath.Dir(getStagingPath()), 0700)
		_ = os.WriteFile(getStagingPath(), sData, 0600)

		printJSON(map[string]any{
			"ok":              true,
			"phone":           phone,
			"phone_code_hash": codeHash,
		})
		return nil
	})
	if err != nil {
		printError("ERR_SEND_CODE", err.Error())
	}
}

func cmdSignIn(phone, code, password string) {
	phone = normalizePhone(phone)
	var codeHash string
	if data, err := os.ReadFile(getStagingPath()); err == nil {
		var s AuthStaging
		if json.Unmarshal(data, &s) == nil {
			if phone == "" {
				phone = s.Phone
			}
			codeHash = s.PhoneCodeHash
		}
	}
	if phone == "" || code == "" {
		printError("ERR_INVALID_ARGS", "Phone and login code are required")
		return
	}

	client, err := createClient()
	if err != nil {
		printError("ERR_CLIENT", err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	err = client.Run(ctx, func(ctx context.Context) error {
		_, err := client.Auth().SignIn(ctx, phone, code, codeHash)
		if err != nil {
			if errors.Is(err, auth.ErrPasswordAuthNeeded) {
				if password == "" {
					printJSON(map[string]any{
						"ok":      false,
						"code":    "2FA_REQUIRED",
						"message": "Two-factor authentication password required",
					})
					return nil
				}
				if _, pErr := client.Auth().Password(ctx, password); pErr != nil {
					return pErr
				}
			} else {
				return err
			}
		}

		// Clean staging
		_ = os.Remove(getStagingPath())

		status, _ := client.Auth().Status(ctx)
		var userMap map[string]any
		if status != nil && status.User != nil {
			u := status.User
			userMap = map[string]any{
				"id":         u.ID,
				"first_name": u.FirstName,
				"username":   u.Username,
				"phone":      u.Phone,
			}
		}

		// Auto-detect existing channel
		var channelMap any
		if ch, _ := findStorageChannel(ctx, client.API()); ch != nil {
			var u *tg.User
			if status != nil {
				u = status.User
			}
			_ = saveDestConfig(ch, u)
			channelMap = map[string]any{
				"id":    fmt.Sprintf("-100%d", ch.ID),
				"title": ch.Title,
			}
		}

		printJSON(map[string]any{
			"ok":      true,
			"user":    userMap,
			"channel": channelMap,
		})
		return nil
	})
	if err != nil {
		printError("ERR_SIGN_IN", err.Error())
	}
}

func cmdCheckAuth() {
	client, err := createClient()
	if err != nil {
		printError("ERR_CLIENT", err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = client.Run(ctx, func(ctx context.Context) error {
		status, err := client.Auth().Status(ctx)
		if err != nil || status == nil || !status.Authorized {
			printJSON(map[string]any{
				"ok":      true,
				"is_auth": false,
			})
			return nil
		}

		u := status.User
		userMap := map[string]any{
			"id":         u.ID,
			"first_name": u.FirstName,
			"username":   u.Username,
			"phone":      u.Phone,
		}

		var channelMap any
		ch, _ := findStorageChannel(ctx, client.API())
		if ch != nil {
			_ = saveDestConfig(ch, u)
			channelMap = map[string]any{
				"id":    fmt.Sprintf("-100%d", ch.ID),
				"title": ch.Title,
			}
		} else if dest, _ := loadDestConfig(); dest != nil && dest.ChannelID != "" {
			channelMap = map[string]any{
				"id":    dest.ChannelID,
				"title": dest.ChannelTitle,
			}
		}

		printJSON(map[string]any{
			"ok":      true,
			"is_auth": true,
			"user":    userMap,
			"channel": channelMap,
		})
		return nil
	})
	if err != nil {
		printJSON(map[string]any{
			"ok":      true,
			"is_auth": false,
		})
	}
}

func cmdInitStorage(customTitle string) {
	client, err := createClient()
	if err != nil {
		printError("ERR_CLIENT", err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	err = client.Run(ctx, func(ctx context.Context) error {
		status, err := client.Auth().Status(ctx)
		if err != nil || status == nil || !status.Authorized {
			printError("ERR_NOT_AUTH", "Not authenticated with Telegram")
			return nil
		}

		// First: auto-detect existing channel
		ch, _ := findStorageChannel(ctx, client.API())
		if ch != nil {
			_ = saveDestConfig(ch, status.User)
			printJSON(map[string]any{
				"ok": true,
				"channel": map[string]any{
					"id":    fmt.Sprintf("-100%d", ch.ID),
					"title": ch.Title,
				},
				"reused": true,
			})
			return nil
		}

		title := strings.TrimSpace(customTitle)
		if title == "" {
			title = generateRandomChannelName()
		} else if !strings.HasSuffix(title, "VDB") {
			title = title + "_VDB"
		}

		updates, err := client.API().ChannelsCreateChannel(ctx, &tg.ChannelsCreateChannelRequest{
			Broadcast: true,
			Title:     title,
			About:     "VD-Backup private cloud backup storage",
		})
		if err != nil {
			return err
		}

		var createdChannel *tg.Channel
		if u, ok := updates.(*tg.Updates); ok {
			for _, chat := range u.Chats {
				if c, ok := chat.(*tg.Channel); ok {
					createdChannel = c
					break
				}
			}
		}

		if createdChannel == nil {
			return errors.New("failed to retrieve created channel details")
		}

		_ = saveDestConfig(createdChannel, status.User)
		printJSON(map[string]any{
			"ok": true,
			"channel": map[string]any{
				"id":    fmt.Sprintf("-100%d", createdChannel.ID),
				"title": createdChannel.Title,
			},
			"created": true,
		})
		return nil
	})
	if err != nil {
		printError("ERR_INIT_STORAGE", err.Error())
	}
}

func cmdUpload(destID, dir, opid string) {
	dest, _ := loadDestConfig()

	files, err := filepath.Glob(filepath.Join(dir, "*"))
	if err != nil || len(files) == 0 {
		printError("ERR_NO_FILES", "No files found to upload in "+dir)
		return
	}

	client, err := createClient()
	if err != nil {
		printError("ERR_CLIENT", err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	err = client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		peer, err := parseChannelInputPeer(dest, destID, ctx, api)
		if err != nil {
			return err
		}

		u := uploader.NewUploader(api).WithPartSize(512 * 1024).WithThreads(4)
		var uploaded []map[string]any

		totalFiles := len(files)
		for idx, filePath := range files {
			stat, err := os.Stat(filePath)
			if err != nil || stat.IsDir() {
				continue
			}

			checksum, _ := computeSHA256(filePath)
			fileName := filepath.Base(filePath)

			pct := int((float64(idx) / float64(totalFiles)) * 95)
			if pct < 5 {
				pct = 5
			}
			updateProgress(opid, fmt.Sprintf("telegram: %s", fileName), fileName, pct)

			uploadFile, err := u.FromPath(ctx, filePath)
			if err != nil {
				return fmt.Errorf("upload %s failed: %w", fileName, err)
			}

			metaMap := map[string]any{
				"app":       fileName,
				"size":      stat.Size(),
				"sha256":    checksum,
				"opid":      opid,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			}
			metaBytes, _ := json.Marshal(metaMap)

			res, err := api.MessagesSendMedia(ctx, &tg.MessagesSendMediaRequest{
				Peer: peer,
				Media: &tg.InputMediaUploadedDocument{
					File:     uploadFile,
					MimeType: "application/octet-stream",
					Attributes: []tg.DocumentAttributeClass{
						&tg.DocumentAttributeFilename{
							FileName: fileName,
						},
					},
				},
				Message:  string(metaBytes),
				RandomID: rand.Int63(),
			})
			if err != nil {
				return fmt.Errorf("send media %s failed: %w", fileName, err)
			}

			var msgID int
			if upd, ok := res.(*tg.Updates); ok {
				for _, update := range upd.Updates {
					if m, ok := update.(*tg.UpdateNewChannelMessage); ok {
						if msg, ok := m.Message.(*tg.Message); ok {
							msgID = msg.ID
							break
						}
					}
				}
			}

			uploaded = append(uploaded, map[string]any{
				"name":       fileName,
				"size":       stat.Size(),
				"sha256":     checksum,
				"message_id": msgID,
			})
		}

		updateProgress(opid, "telegram: upload complete", "", 100)

		printJSON(map[string]any{
			"ok":       true,
			"uploaded": uploaded,
		})
		return nil
	})
	if err != nil {
		printError("ERR_UPLOAD", err.Error())
	}
}

func cmdListBackups(destID string) {
	dest, _ := loadDestConfig()

	client, err := createClient()
	if err != nil {
		printError("ERR_CLIENT", err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	err = client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		peer, err := parseChannelInputPeer(dest, destID, ctx, api)
		if err != nil {
			return err
		}

		history, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
			Peer:  peer,
			Limit: 100,
		})
		if err != nil {
			return err
		}

		var backups []map[string]any
		if mod, ok := history.AsModified(); ok {
			for _, mClass := range mod.GetMessages() {
				msg, ok := mClass.(*tg.Message)
				if !ok {
					continue
				}
				mediaDoc, ok := msg.Media.(*tg.MessageMediaDocument)
				if !ok {
					continue
				}
				doc, ok := mediaDoc.Document.(*tg.Document)
				if !ok {
					continue
				}

				var fileName string
				for _, attr := range doc.Attributes {
					if fn, ok := attr.(*tg.DocumentAttributeFilename); ok {
						fileName = fn.FileName
						break
					}
				}

				var meta map[string]any
				_ = json.Unmarshal([]byte(msg.Message), &meta)

				backups = append(backups, map[string]any{
					"message_id": msg.ID,
					"name":       fileName,
					"size":       doc.Size,
					"date":       msg.Date,
					"meta":       meta,
				})
			}
		}

		printJSON(map[string]any{
			"ok":      true,
			"backups": backups,
		})
		return nil
	})
	if err != nil {
		printError("ERR_LIST", err.Error())
	}
}

func cmdDownload(destID, ref, outPath, opid string) {
	dest, _ := loadDestConfig()

	targetMsgID, err := strconv.Atoi(ref)
	if err != nil {
		printError("ERR_INVALID_REF", "Reference must be a message ID")
		return
	}

	client, err := createClient()
	if err != nil {
		printError("ERR_CLIENT", err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	err = client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		peer, err := parseChannelInputPeer(dest, destID, ctx, api)
		if err != nil {
			return err
		}

		inputChannel, ok := peer.(*tg.InputPeerChannel)
		if !ok {
			return errors.New("invalid channel peer")
		}

		res, err := api.ChannelsGetMessages(ctx, &tg.ChannelsGetMessagesRequest{
			Channel: &tg.InputChannel{
				ChannelID:  inputChannel.ChannelID,
				AccessHash: inputChannel.AccessHash,
			},
			ID: []tg.InputMessageClass{
				&tg.InputMessageID{ID: targetMsgID},
			},
		})
		if err != nil {
			return err
		}

		var doc *tg.Document
		if mod, ok := res.AsModified(); ok {
			for _, mClass := range mod.GetMessages() {
				if msg, ok := mClass.(*tg.Message); ok {
					if mediaDoc, ok := msg.Media.(*tg.MessageMediaDocument); ok {
						if d, ok := mediaDoc.Document.(*tg.Document); ok {
							doc = d
							break
						}
					}
				}
			}
		}

		if doc == nil {
			return fmt.Errorf("message %d does not contain a document", targetMsgID)
		}

		_ = os.MkdirAll(filepath.Dir(outPath), 0755)

		loc := &tg.InputDocumentFileLocation{
			ID:            doc.ID,
			AccessHash:    doc.AccessHash,
			FileReference: doc.FileReference,
		}
		d := downloader.NewDownloader().WithPartSize(512 * 1024)
		if _, err := d.Download(api, loc).ToPath(ctx, outPath); err != nil {
			return fmt.Errorf("download failed: %w", err)
		}

		printJSON(map[string]any{
			"ok":   true,
			"file": outPath,
			"size": doc.Size,
		})
		return nil
	})
	if err != nil {
		printError("ERR_DOWNLOAD", err.Error())
	}
}

func cmdLogout() {
	client, err := createClient()
	if err == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		_ = client.Run(ctx, func(ctx context.Context) error {
			_, _ = client.API().AuthLogOut(ctx)
			return nil
		})
		cancel()
	}

	_ = os.Remove(getSessionPath())
	_ = os.Remove(getStagingPath())
	_ = os.Remove(getDestPath())

	printJSON(map[string]any{
		"ok": true,
	})
}

func parseUploadArgs(args []string) (dest, dir, opid string) {
	dest = "telegram"
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--dest" || a == "-dest" {
			if i+1 < len(args) {
				dest = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--dest=") || strings.HasPrefix(a, "-dest=") {
			dest = strings.SplitN(a, "=", 2)[1]
		} else if a == "--dir" || a == "-dir" {
			if i+1 < len(args) {
				dir = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--dir=") || strings.HasPrefix(a, "-dir=") {
			dir = strings.SplitN(a, "=", 2)[1]
		} else if a == "--opid" || a == "-opid" {
			if i+1 < len(args) {
				opid = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--opid=") || strings.HasPrefix(a, "-opid=") {
			opid = strings.SplitN(a, "=", 2)[1]
		} else {
			if dest == "telegram" {
				dest = a
			} else if dir == "" {
				dir = a
			} else if opid == "" {
				opid = a
			}
		}
	}
	return
}

func parseDownloadArgs(args []string) (dest, ref, out, opid string) {
	dest = "telegram"
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--dest" || a == "-dest" {
			if i+1 < len(args) {
				dest = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--dest=") || strings.HasPrefix(a, "-dest=") {
			dest = strings.SplitN(a, "=", 2)[1]
		} else if a == "--ref" || a == "-ref" {
			if i+1 < len(args) {
				ref = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--ref=") || strings.HasPrefix(a, "-ref=") {
			ref = strings.SplitN(a, "=", 2)[1]
		} else if a == "--out" || a == "-out" {
			if i+1 < len(args) {
				out = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--out=") || strings.HasPrefix(a, "-out=") {
			out = strings.SplitN(a, "=", 2)[1]
		} else if a == "--opid" || a == "-opid" {
			if i+1 < len(args) {
				opid = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--opid=") || strings.HasPrefix(a, "-opid=") {
			opid = strings.SplitN(a, "=", 2)[1]
		} else {
			if dest == "telegram" {
				dest = a
			} else if ref == "" {
				ref = a
			} else if out == "" {
				out = a
			} else if opid == "" {
				opid = a
			}
		}
	}
	return
}

func parseListRemoteArgs(args []string) (dest string) {
	dest = "telegram"
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--dest" || a == "-dest" {
			if i+1 < len(args) {
				dest = args[i+1]
				i++
			}
		} else if strings.HasPrefix(a, "--dest=") || strings.HasPrefix(a, "-dest=") {
			dest = strings.SplitN(a, "=", 2)[1]
		} else {
			dest = a
		}
	}
	return
}

func main() {
	if len(os.Args) < 2 {
		printError("ERR_NO_COMMAND", "Subcommand required (send-code, sign-in, check-auth, init-storage, upload, download, list-remote, logout)")
		os.Exit(1)
	}

	verb := os.Args[1]
	args := os.Args[2:]

	switch verb {
	case "send-code":
		fs := flag.NewFlagSet("send-code", flag.ExitOnError)
		phone := fs.String("phone", "", "Phone number")
		_ = fs.Parse(args)
		cmdSendCode(*phone)

	case "sign-in":
		fs := flag.NewFlagSet("sign-in", flag.ExitOnError)
		phone := fs.String("phone", "", "Phone number")
		code := fs.String("code", "", "Login code")
		password := fs.String("password", "", "2FA password")
		_ = fs.Parse(args)
		cmdSignIn(*phone, *code, *password)

	case "check-auth", "status":
		cmdCheckAuth()

	case "init-storage":
		fs := flag.NewFlagSet("init-storage", flag.ExitOnError)
		title := fs.String("title", "", "Channel title")
		_ = fs.Parse(args)
		cmdInitStorage(*title)

	case "upload":
		dest, dir, opid := parseUploadArgs(args)
		cmdUpload(dest, dir, opid)

	case "list-remote", "list-backups":
		dest := parseListRemoteArgs(args)
		cmdListBackups(dest)

	case "download":
		dest, ref, out, opid := parseDownloadArgs(args)
		cmdDownload(dest, ref, out, opid)

	case "logout":
		cmdLogout()

	default:
		printError("ERR_UNKNOWN_VERB", fmt.Sprintf("Unknown subcommand '%s'", verb))
		os.Exit(1)
	}
}
