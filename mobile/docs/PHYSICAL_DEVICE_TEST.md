# FocusFlow physical-device verification

Record one row per real device/build. Do not mark a platform verified from Expo export, browser preview, emulator or simulator.

## Test record

| Field | Value |
| --- | --- |
| Date/time | 2026-08-13, 06:29–10:14 (Asia/Ho_Chi_Minh) |
| Tester | Codex, điều khiển thiết bị vật lý qua ADB với người dùng giữ quyền mở khóa |
| Device/model | Samsung SM-G988B, serial `R5CN204E8QF`, 1440×3200, density 560 |
| OS/version | Android 13 / API 33 |
| Build type | Development build ARM64 cài trực tiếp; không dùng emulator/simulator |
| App version/build | 1.0.0 / package `com.lighthouse2815.focusflow` |
| API environment | Backend local port 8080 và Metro 8081 qua ADB reverse |
| Result | Pass cho checklist Android trên thiết bị thật; chỉ còn ca mở rộng qua nửa đêm chưa được ép chạy bằng cách đổi đồng hồ hệ thống |

Use `Pass`, `Fail` or `Blocked` and add evidence/notes for every row.

| Area | Scenario | Expected result | Result | Evidence/notes |
| --- | --- | --- | --- | --- |
| Install | Install/open cold app | FocusFlow icon/splash render; no crash; safe area correct | Pass | Expo Go 57.0.2 không tương thích native worklets nên dùng đúng development build. APK ARM64 SHA-256 `3303E1ECF0F5C53D2AC432EC34AEEB1A1D5E7DE116125F833D48F78A2B0813F3`; install `-r` thành công. |
| Auth | Register | Account created; protected tabs open; no credential in logs | Pass | Đăng ký hai tài khoản QA tổng hợp bằng form/keyboard thật; vào Today sau server response. Không ghi credential vào tài liệu/log hoặc Samsung Pass. |
| Auth | Logout/login | Secure local state clears; login restores server data | Pass | Logout có xác nhận về Login; đăng nhập lại cùng tài khoản thứ hai mở đúng tài khoản trống `0/0`, không lẫn dữ liệu tài khoản trước. |
| Auth | Kill/reopen | Valid secure session restores without login flash | Pass | Force-stop/reopen giữ phiên đăng nhập và mở Today trực tiếp. |
| Navigation | Five tabs + secondary routes | Today, Habits, Focus, Projects, Insights and Settings navigate/back correctly | Pass | Cả 5 tab, Settings, form/detail Habit và Project/Task đã mở/back trên thiết bị. |
| Habit | Create/edit/archive/delete | Server state and lists remain consistent | Pass | Tạo Boolean `Morning walk`, sửa thành `Morning walk updated`, archive; tạo Count `Read QA pages` rồi xóa vĩnh viễn; tạo Duration `English QA`. |
| Habit | Boolean complete/undo | One tap updates progress and dashboard | Pass | `QA_Boolean` hoàn thành thành checked/streak 1; undo đưa về unchecked/streak 0 và dashboard cập nhật theo server. |
| Habit | Count +/- | Value changes once; cannot fall below zero | Pass | `QA_Count` chạy `0 → 1 → 0`; bấm giảm thêm tại zero vẫn giữ `0`, không phát sinh số âm. |
| Habit | Duration focus link | Habit is preselected; completed focus updates duration | Pass | Duration unit được sửa từ `lần` sang `phút`; phiên link `English QA` cập nhật Today từ `0/5` lên `1/5 phút`. |
| Habit | Schedule/heatmap/streak | Dates match account timezone, including around midnight | Blocked | Streak cơ bản và timezone `Asia/Ho_Chi_Minh` hiển thị đúng; chưa chạy ca qua nửa đêm trên phần cứng. |
| Project | Project/task CRUD | Create/edit/complete/archive persist after refresh | Pass | Tạo `QA_Project` và `QA_Task`, complete task làm bộ đếm thành 1 completed/0 open; archive project rồi refresh khiến project biến mất khỏi danh sách. |
| Focus | Start linked/unlinked session | One active server session; context shown correctly | Pass | Đã chạy linked Project + Task + Duration Habit và nhiều phiên độc lập; server chỉ trả một active session. |
| Lifecycle | Background/foreground | Remaining time reconciles from `expectedEndAt` | Pass | Phiên 1 phút hoàn thành khi app ở nền; foreground chuyển Recent thành `1 phút · Hoàn thành`. |
| Lifecycle | Lock/unlock screen | Timer remains accurate; no duplicate session | Pass | Khóa ở khoảng 00:22, chờ 30 giây, người dùng tự mở khóa; server hoàn thành đúng một phiên. Không đọc/yêu cầu PIN. |
| Focus | Pause/resume | Paused display freezes; resume uses extended server timestamp | Pass | Pause giữ `00:25` qua 4 giây; resume chạy tiếp. Một phiên khác pause/reconnect/resume giữ chính xác timestamp server. |
| Focus | Complete/cancel | Correct terminal state; no duplicate completion; linked data refreshes | Pass | Manual complete tạo break; cancel có Android confirmation và Recent `Đã hủy`; không tạo duplicate sau reconnect. |
| Break | Short/long break | Correct break is selected and restored after app restart | Pass | Short/long break được chọn đúng. Với short break thử nghiệm 1 phút, force-stop ở `00:58`, reopen hiện đúng cùng pha break tại `00:30`, chứng minh khôi phục theo timestamp. |
| Notification | Grant permission | Permission appears only after explicit Settings action | Pass | Denied/granted được đổi trong Android App Info; hook AppState mới cập nhật Settings ngay khi trở lại app. `POST_NOTIFICATIONS: granted=true`. |
| Notification | Focus completion | Fires at expected end; tap opens Focus | Pass | Exact alarm `08:47:53.148`; broadcast nhận `08:47:53.149`, channel HIGH, sound/vibrate. Khay hiển thị “Phiên tập trung đã kết thúc”; tap mở đúng Focus/short break. Evidence local: `.tmp/device-qa/exact-notification-visible.png`, `exact-notification-deeplink.png`. |
| Notification | Pause/resume | Old notification is cancelled; only rescheduled one fires | Pass | Dumpsys ghi old PendingIntent `reason=alarm_cancelled`; resume tạo alarm mới `window=0`, `exactAllowReason=permission`, không còn pending cũ. |
| Notification | Cancel/complete | Stale focus notification never fires | Pass | Cancel xóa pending alarm 09:14:48; complete xóa focus alarm và chuyển sang lịch break. Mốc cũ chỉ còn trong alarm history. |
| Notification | Break completion | Fires at break end; tap opens Focus | Pass | Khi màn hình khóa, Android nhận broadcast lúc `09:47:56.944` và đăng notification khoảng `09:47:58.459`; khay hiện “Giờ nghỉ đã kết thúc” / “Bạn có thể bắt đầu nhịp tập trung tiếp theo.”, tap mở đúng Focus. |
| Notification | Habit DAILY/WEEKDAYS | Fires on configured time/day; tap opens Habits | Pass | DAILY phát đúng `09:52:00.004`; WEEKDAYS chỉ chọn Thứ Năm phát đúng `10:03:00.001`. Notification “Nhắc thói quen” hiển thị `QA_Boolean`; tap ca DAILY mở đúng Habit Detail. |
| Notification | Deny permission | No crash/re-prompt loop; Settings offers OS settings | Pass | Khi tắt quyền, Settings báo `Đã bị chặn`; không crash/re-prompt. Bật lại bên OS, AppState refresh thành `Đã được hệ điều hành cho phép`. |
| Network | Disconnect/reconnect idle | Offline banner appears; cached data remains; queries recover | Pass | Tháo riêng ADB reverse 8080, đóng socket bằng force-stop; query báo lỗi có nút `Thử lại`. Gắn lại reverse và retry xóa lỗi. |
| Network | Disconnect/reconnect active timer | Timer display remains timestamp-based; no second active session | Pass | Paused timer `15:23` giữ local; Resume offline không giả thành công và hiện lỗi action. Reconnect + Resume đổi sang running `15:16`; manual complete thành công, không duplicate. Evidence local: `.tmp/device-qa/offline-resume-error.png`, `reconnect-resumed.png`. |
| Errors | API 4xx/5xx/timeout | Actionable Vietnamese message; no raw Java exception | Pass | Network timeout thực tế hiện “Không thể kết nối máy chủ…”; mapping 401/403/404/409/422/5xx và lọc Java exception được phủ bởi automated tests. |
| Accessibility | Font scale + screen reader | Timer/progress/actions have useful labels; layout remains usable | Pass | Font scale 1.3 đã kiểm Today/Focus/Settings; tab bar, timer/progress/actions vẫn có nhãn hữu ích. Samsung TalkBack được bind thật với touch exploration, focus indicator đi qua Settings và `QA_Count` detail; không cấp quyền quản lý cuộc gọi. Sau test đã khôi phục font `1.0`, TalkBack/accessibility/touch exploration đều tắt. |
| Keyboard | Auth/create/edit forms | Focus order, submit and keyboard avoidance work | Pass | Register/Login, Habit, Project/Task và custom duration đã nhập/submitted bằng bàn phím Samsung; form cuộn và nút submit còn tiếp cận được. |

## Release gate

- [x] No Critical/High device-test failures remain.
- [x] Notification timing tested once with screen locked.
- [x] Timer tested once across app process termination/reopen.
- [x] Network recovery tested during an active session.
- [x] Device/OS/build evidence is recorded above.
- [x] Android or iOS is only called “device verified” for the platform actually tested.

## Defects found and closed during this run

1. Text inputs exposed `disabled=true` to accessibility whenever `editable` was omitted. The condition now only disables for `editable === false` and is covered by component tests.
2. Switching Habit type to Duration retained the Count unit `lần`. The type transition now selects `phút`, with schema/form tests and device evidence.
3. Notification permission stayed stale after returning from Android Settings. `useNotificationPermission` now refreshes on AppState `active`, with a lifecycle test and denied/granted device evidence.
4. One-minute alarms were inexact and Samsung Freecess deferred them because the build did not request exact alarms. `android.permission.SCHEDULE_EXACT_ALARM` is now in Expo config; the installed package reports it granted and the device delivered within approximately 1 ms of the requested time.
5. Pause/Resume/Complete/Cancel/Interruption errors could fail without a visible action error. Focus now keeps server truth and renders an actionable Vietnamese alert; a physical disconnect/reconnect run and integration test cover it.
6. The tab bar did not reserve the Android bottom inset reliably at font scale 1.3. Its height/padding now include `insets.bottom`; the physical hierarchy grew from a 47 px to a 107 px usable tab region.
7. Active-query reconciliation could race a global completion: a stale active response could restore the completed session, or a `null` response could clear it to Ready before the break was committed. Reconciliation now ignores the session being completed until success or failure resolves; the integration suite passed 10 consecutive isolated runs and the full check.

## Extended observation not forced on the device

The only `Blocked` row is the habit schedule/heatmap boundary exactly across local midnight. The date/timezone logic remains covered by automated tests, while the physical run deliberately did not change the user's system clock. This is not a Critical/High failure in the tested Android release path.
