# FocusFlow Mobile completion audit

Ngày rà soát: 2026-08-13. Tài liệu này đối chiếu phạm vi M1–M11 với mã nguồn, kiểm tra tự động và một lượt QA trên Samsung SM-G988B chạy Android 13/API 33. Không dùng emulator/simulator. Android chỉ được gọi là đã kiểm trên đúng các dòng `Pass` của `docs/PHYSICAL_DEVICE_TEST.md`; iOS chưa được kiểm trên thiết bị thật.

## Quy ước trạng thái

- **Đạt bằng mã nguồn/tự động**: đã có implementation và kiểm tra phù hợp trong repository.
- **Chờ dịch vụ ngoài**: cần tài khoản/credential bên ngoài mà repository không được phép chứa.
- **Đạt trên Android thật**: đã chạy trên thiết bị vật lý nêu trên và có evidence/notes trong ma trận M10.
- **Còn gate thiết bị**: một phần native matrix chưa chạy đủ để tuyên bố đạt.

## Ma trận M1–M11

| Mốc | Phạm vi và bằng chứng chính | Trạng thái |
| --- | --- | --- |
| M1 | Expo SDK 57, React Native/TypeScript, Expo Router, 5 tab và nested routes; provider trung tâm cho Query, lifecycle timer, day boundary và notification | Đạt bằng mã nguồn/tự động |
| M2 | Register/login/refresh/logout/current user; native token pair lưu bằng SecureStore `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; logout luôn dọn token, timer, notification và query cache | Đạt bằng mã nguồn/tự động và Android thật |
| M3 | Today lấy dashboard, habits và project/task từ REST API; trạng thái loading/empty/error/offline; không seed hoặc dựng tiến độ cục bộ | Đạt bằng mã nguồn/tự động |
| M4 | Habit list/detail/create/edit; Boolean, Count, Duration; schedule DAILY/WEEKDAYS/INTERVAL/TIMES_PER_WEEK; heatmap, streak và optimistic UX chỉ khi mutation được server xác nhận | Đạt bằng mã nguồn/tự động và Android thật; chỉ chưa ép chạy quan sát đúng thời khắc qua nửa đêm |
| M5 | Focus start/pause/resume/complete/cancel, habit/project/task link, server timestamp là nguồn sự thật; khôi phục sau restart/foreground/reconnect; tự complete toàn cục và retry khi sync lỗi | Đạt bằng mã nguồn/tự động và Android thật |
| M6 | Project CRUD/archive, task create/edit/complete và mở Focus với liên kết có sẵn | Đạt bằng mã nguồn/tự động và Android thật, gồm task complete và project archive sau refresh |
| M7 | Local notification cho focus/break/habit; reschedule/cancel theo lifecycle; xử lý profile IANA timezone, interval và day-boundary; quyền chỉ xin sau hành động rõ ràng của người dùng | Focus, break và habit DAILY/WEEKDAYS notification đều đạt exact delivery/tap route trên Android thật, gồm một ca màn hình khóa |
| M8 | Focus today/current week/selected range, habit completion và interruption trend đều lấy hoặc suy ra từ response backend; không tạo insight giả | Đạt bằng mã nguồn/tự động |
| M9 | Safe area, bàn phím/form validation, loading/empty/error/offline, touch target, accessibility labels, narrow layout và controlled font scaling | Font scale 1.3, safe-area tab bar, keyboard và Samsung TalkBack cơ bản đạt trên Android thật; không tuyên bố VoiceOver |
| M10 | Ma trận cài app, auth restore, background/lock/foreground, notification delivery/tap, offline/reconnect, accessibility và keyboard trên Android thật | Android device verified; chỉ còn quan sát mở rộng đúng thời khắc qua nửa đêm, không tuyên bố iOS |
| M11 | README/runbook, architecture, EAS profiles, owned icon/splash, Android/iOS Hermes export, CI mobile gate, secret/dependency review | Đạt bằng mã nguồn/tự động; signed EAS build chờ credential ngoài |

## Bằng chứng trong repository

- Routing và shell: `app/`, `src/components/AppProviders.tsx`, `src/layouts/Screen.tsx`.
- API và auth: `src/services/apiClient.ts`, `src/services/authService.ts`, `src/services/secureStorage.native.ts`, `src/store/authStore.ts`.
- Đồng bộ focus/lifecycle: `src/components/FocusSessionSync.tsx`, `src/store/timerStore.ts`, `src/hooks/useTimerTicker.ts`.
- Midnight/timezone: `src/hooks/useTodayKey.ts`, `src/components/DayBoundarySync.tsx`, `src/utils/date.ts`.
- Local notification: `src/components/NotificationCoordinator.tsx`, `src/services/notificationService.ts`, `src/store/notificationStore.ts`.
- Các màn hình nghiệp vụ: `src/screens/TodayScreen.tsx`, `HabitsScreen.tsx`, `HabitDetailScreen.tsx`, `FocusScreen.tsx`, `ProjectsScreen.tsx`, `ProjectDetailScreen.tsx`, `InsightsScreen.tsx`, `SettingsScreen.tsx`.
- Automated tests: các file `*.test.ts`/`*.test.tsx` cạnh module; CI chạy `npm run check`, `npm run expo:doctor` và Android Hermes export.
- Native config/build: `app.json`, `eas.json`, `.env.example`, `assets/` và `scripts/generate-brand-assets.ps1`.
- Security/dependency decisions: `docs/SECURITY_REVIEW.md`.
- M10 procedure và mẫu evidence: `docs/PHYSICAL_DEVICE_TEST.md`.

## Lệnh tái kiểm tra không cần thiết bị

Chạy trong `mobile/`:

```powershell
npm ci
npm run check
npm run expo:doctor
npm run expo:config
npm run export:android
npx expo export --platform ios --output-dir dist-ios
npm audit --omit=dev
```

`expo export` chứng minh TypeScript/Metro có thể tạo bundle Hermes cho platform tương ứng; nó không chứng minh SecureStore, notification, background/lock-screen, keyboard hay accessibility service chạy đúng trên phần cứng.

## Kết quả verification hiện tại

- `npm run check`: đạt sau device fixes; typecheck và lint sạch, 17/17 suites với 50/50 tests đạt, Expo dependency alignment báo up to date.
- `npm run expo:doctor`: đạt 20/20 checks.
- `npm run expo:config`: Android public config chứa `android.permission.SCHEDULE_EXACT_ALARM`.
- Android export: đạt, 1.854 modules, Hermes bundle khoảng 4,4 MB.
- iOS export: đạt, 1.725 modules, Hermes bundle khoảng 4,1 MB.
- Backend đang chạy tại thời điểm kiểm tra trả health `UP`; OpenAPI có đủ 14/14 static endpoint patterns mà mobile gọi, gồm cả `/auth/refresh`.
- Secret/sensitive-log scan trong source/config không có match.
- Web preview smoke tại viewport 390×844 và 320×640 không có horizontal overflow; login/register navigation và validation alert semantics hoạt động. Đây chỉ là layout smoke, không thay thế native QA.
- `npm audit --omit=dev` vẫn báo 23 transitive findings (8 moderate, 15 high) thuộc Expo/Metro/xcode build-tool chain; phân tích và quyết định không ép breaking downgrade nằm trong `docs/SECURITY_REVIEW.md`.
- Development APK ARM64 build thành công tại đường dẫn build tạm ngắn trên ổ T, SHA-256 `3303E1ECF0F5C53D2AC432EC34AEEB1A1D5E7DE116125F833D48F78A2B0813F3`; cài đè trên SM-G988B thành công. Package runtime báo `SCHEDULE_EXACT_ALARM: granted=true` và `POST_NOTIFICATIONS: granted=true`.
- Focus alarm yêu cầu `08:47:53.148` được Android dispatch lúc `08:47:53.149`; notification HIGH có sound/vibrate xuất hiện trong khay và tap mở đúng Focus/short break.
- Active session đã qua background, lock/unlock, force-stop/reopen, pause/resume, mất/kết nối lại API và manual complete mà không tạo duplicate. Offline mutation không đổi state giả và hiện lỗi tiếng Việt có thể hành động.
- Font scale thiết bị được tăng từ `1.0` lên `1.3`, kiểm Today/Focus/Settings, rồi khôi phục chính xác `1.0`. Tab bar được sửa để cộng `insets.bottom` và kiểm lại trên hierarchy vật lý.
- Boolean `QA_Boolean` complete/undo cập nhật streak `1 → 0`; Count `QA_Count` chạy `0 → 1 → 0` và không thể giảm dưới zero. `QA_Project`/`QA_Task` đã qua task complete, project archive và refresh danh sách.
- Short break được force-stop/reopen từ `00:58` về `00:30` trong cùng pha, xác nhận khôi phục bằng timestamp thay vì bộ đếm cục bộ.
- Với màn hình khóa, break broadcast lúc `09:47:56.944`, notification được đăng khoảng `09:47:58.459`, hiện đúng title/body và tap mở Focus.
- Habit reminder DAILY phát lúc `09:52:00.004`; WEEKDAYS chỉ chọn Thứ Năm phát lúc `10:03:00.001`. Notification DAILY tap mở đúng `QA_Boolean` Habit Detail.
- Samsung TalkBack được bind thật với touch exploration và focus indicator trên Settings/Habit Detail. Không cấp quyền quản lý cuộc gọi; sau QA đã khôi phục font `1.0`, TalkBack/accessibility/touch exploration về tắt, tắt notification preference và xóa toàn bộ native scheduled notification/alarm thử nghiệm.
- Global focus completion đã được chặn race với active-query reconciliation; integration test liên quan đạt 10/10 lượt cô lập liên tiếp, sau đó toàn bộ `npm run check` đạt 50/50 tests.

## Release gates còn mở

1. Nếu cần mức quan sát mở rộng, chạy thêm ca habit/heatmap đúng thời khắc qua nửa đêm trên thiết bị dành riêng cho QA. Logic timezone/day-boundary đã có automated tests; lượt này không đổi đồng hồ hệ thống trên điện thoại của người dùng và đây không phải lỗi Critical/High đã biết.
2. Nếu phát hành iOS, lặp lại toàn bộ case native trên iPhone/iPad thật; không suy diễn từ Android hoặc iOS export.
3. Tạo signed EAS artifact bằng Expo account/credential của release owner, sau đó cài đúng artifact đó để làm final smoke. Repository chỉ cung cấp cấu hình; credential không được commit.
4. Theo dõi và cập nhật dependency line Expo/Metro khi có bản vá tương thích cho các advisory build-tool transitive đã ghi trong `docs/SECURITY_REVIEW.md`.
