# FocusFlow Mobile

Ứng dụng React Native dùng Expo SDK 57 cho Android/iOS. Mobile dùng chung Spring Boot REST API và tài khoản với FocusFlow Web; server là nguồn dữ liệu chuẩn cho habit, project/task, streak, analytics và Focus Session.

## Yêu cầu

- Node.js `>= 22.13` (SDK 57 dùng React Native 0.86).
- npm.
- Spring Boot API đang chạy và có thể truy cập từ điện thoại qua mạng LAN hoặc HTTPS.
- Điện thoại Android/iOS thật. Quy trình của dự án không dùng emulator/simulator.
- Expo Go cho vòng lặp JS nhanh; development build được khuyến nghị để xác minh native configuration gần bản release.

## Cài đặt và cấu hình API

```powershell
cd D:\be-focus\mobile
npm install
Copy-Item .env.example .env
```

Sửa `.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:8080
```

Không dùng `localhost` hoặc `127.0.0.1`: trên điện thoại, hai địa chỉ đó trỏ về chính điện thoại. Dùng IPv4 LAN của máy chạy backend và bảo đảm firewall cho phép cổng API. Client tự nối `/api/v1`, vì vậy cả URL có hoặc không có suffix này đều hợp lệ.

Biến `EXPO_PUBLIC_*` nằm trong bundle và không được chứa secret. Repository không chứa JWT, API key hay tài khoản mẫu. Access/refresh token được lưu bằng Expo SecureStore trên Android/iOS; bản web-preview chỉ dùng `sessionStorage`.

## Chạy trên điện thoại thật

### Expo Go

1. Khởi động backend và xác minh health/API trên địa chỉ LAN.
2. Cài Expo Go trên điện thoại và nối điện thoại cùng Wi-Fi với máy tính.
3. Chạy `npm start`, quét QR bằng Expo Go.
4. Nếu LAN discovery bị chặn nhưng có Internet, chạy thủ công `npx expo start --tunnel`.

Local notifications (kết thúc focus/break và habit reminder) dùng Expo Notifications. App chỉ hỏi quyền khi người dùng bấm **Cho phép trên thiết bị** trong Settings; không xin quyền ngay khi mở app. Remote push không nằm trong scope vì backend chưa cần push infrastructure.

### Development build qua USB

Development build chứa đúng native plugins và phù hợp cho vòng kiểm thử release:

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile development
```

Tải artifact EAS về, bật Developer options và USB debugging trên Android, rồi cài APK đã tạo bằng `adb install <duong-dan-apk>`. Sau khi cài, chạy `npm start -- --dev-client` và mở FocusFlow trên điện thoại. Không tạo AVD và không chạy Android Emulator.

## Các lệnh kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npm run check
npx expo install --check
npm run expo:config
npm run expo:doctor
npm run export:android
```

`expo export` kiểm tra Metro/native JS bundle nhưng không thay thế cài đặt và kiểm thử trên thiết bị thật.

## EAS build

Các profile nằm trong `eas.json`:

```powershell
# Development client cho QA thiết bị thật
npx eas-cli build --platform android --profile development

# APK/AAB nội bộ cho stakeholder/QA
npx eas-cli build --platform android --profile preview

# Artifact release; không tự submit store
npx eas-cli build --platform android --profile production
```

Thiết lập `EXPO_PUBLIC_API_URL` trong EAS Environment tương ứng (`development`, `preview`, `production`). Production phải dùng HTTPS public; địa chỉ LAN chỉ dành cho kiểm thử cục bộ. iOS dùng cùng ba profile nhưng cần tài khoản Apple và thiết bị thật đã được provisioning.

## Hành vi quan trọng

- Timer hiển thị từ timestamp `expectedEndAt` của server, không lấy số lần `setInterval` làm nguồn sự thật.
- Active session được truy vấn lại khi app mở/foreground/reconnect; không tự tạo session thứ hai.
- Start/resume lên lịch local notification đúng timestamp; pause/cancel/complete huỷ request cũ. Break dùng timestamp cục bộ tối thiểu và có thể phục hồi sau app restart.
- Reminder DAILY/WEEKDAYS dùng recurring notification. `TIMES_PER_WEEK` và `INTERVAL` chỉ lên lịch lần kế tiếp nếu habit thuộc ngày hiện tại, vì hệ điều hành không biểu diễn chính xác quy tắc backend này; app đồng bộ lại khi foreground.
- Khi mất mạng, dữ liệu cache vẫn hiển thị và banner giải thích rõ. Mutation cần server báo lỗi có thể retry; không ghi tiến độ giả cục bộ.
- Logout cố gọi backend, sau đó luôn xoá SecureStore, cache timer, lịch notification và TanStack Query cache trên thiết bị.

## Ma trận kiểm thử thiết bị thật

Chạy trên Android thật trước khi gắn nhãn release; iOS thật dùng ma trận tương tự nếu có thiết bị. Biểu mẫu ghi nhận Pass/Fail/evidence đầy đủ nằm tại [`docs/PHYSICAL_DEVICE_TEST.md`](docs/PHYSICAL_DEVICE_TEST.md).

- Cài/mở app; splash, icon và safe area.
- Register, login, logout/login, token/session restore sau khi kill/reopen app.
- Điều hướng 5 tab và back navigation ở Habit/Project/Settings.
- Habit CRUD; Boolean complete/undo; Count tăng/giảm; Duration mở Focus với habit đã chọn; heatmap/streak.
- Project CRUD/archive; task create/edit/complete; mở Focus từ task.
- Start timer; background; lock screen; unlock; foreground; remaining time đúng timestamp.
- Pause/resume; notification cũ không bắn; complete/cancel; short/long break.
- Focus complete cập nhật Duration Habit, project/task và analytics sau sync.
- Cấp/từ chối quyền notification; focus/break/habit reminder; bấm notification mở đúng tab.
- Ngắt mạng/khôi phục mạng giữa phiên; không tạo duplicate active session.
- Kiểm tra font scaling, TalkBack/VoiceOver labels, touch targets và keyboard trên form.

Không ghi “verified on Android/iOS” cho đến khi ma trận này thực sự chạy trên thiết bị tương ứng.

## Giới hạn nền tảng

- Remote push notification không được triển khai; scope hiện tại là local notification.
- Quyền đã bị từ chối phải được bật lại trong Settings của hệ điều hành.
- Bản web chỉ để smoke-check UI/bundle, không có SecureStore/native notification parity.
- Store submission/signing credentials không nằm trong repository và chỉ được dùng qua EAS credential service hoặc CI secret.

Bản ghi rà soát token storage, error handling, secret scan và dependency advisories nằm tại [`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md).

## Tái tạo branding

Icon/splash là bộ nhận diện FocusFlow tự sở hữu, không dùng asset Expo mẫu. Có thể tái tạo các PNG bằng PowerShell trên Windows:

```powershell
.\scripts\generate-brand-assets.ps1
```
