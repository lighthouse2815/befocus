# FocusFlow physical-device verification

Record one row per real device/build. Do not mark a platform verified from Expo export, browser preview, emulator or simulator.

## Test record

| Field | Value |
| --- | --- |
| Date/time | |
| Tester | |
| Device/model | |
| OS/version | |
| Build type | Expo Go / development / preview |
| App version/build | 1.0.0 / |
| API environment | LAN / staging / production |
| Result | Pending |

Use `Pass`, `Fail` or `Blocked` and add evidence/notes for every row.

| Area | Scenario | Expected result | Result | Evidence/notes |
| --- | --- | --- | --- | --- |
| Install | Install/open cold app | FocusFlow icon/splash render; no crash; safe area correct | Pending | |
| Auth | Register | Account created; protected tabs open; no credential in logs | Pending | |
| Auth | Logout/login | Secure local state clears; login restores server data | Pending | |
| Auth | Kill/reopen | Valid secure session restores without login flash | Pending | |
| Navigation | Five tabs + secondary routes | Today, Habits, Focus, Projects, Insights and Settings navigate/back correctly | Pending | |
| Habit | Create/edit/archive/delete | Server state and lists remain consistent | Pending | |
| Habit | Boolean complete/undo | One tap updates progress and dashboard | Pending | |
| Habit | Count +/- | Value changes once; cannot fall below zero | Pending | |
| Habit | Duration focus link | Habit is preselected; completed focus updates duration | Pending | |
| Habit | Schedule/heatmap/streak | Dates match account timezone, including around midnight | Pending | |
| Project | Project/task CRUD | Create/edit/complete/archive persist after refresh | Pending | |
| Focus | Start linked/unlinked session | One active server session; context shown correctly | Pending | |
| Lifecycle | Background/foreground | Remaining time reconciles from `expectedEndAt` | Pending | |
| Lifecycle | Lock/unlock screen | Timer remains accurate; no duplicate session | Pending | |
| Focus | Pause/resume | Paused display freezes; resume uses extended server timestamp | Pending | |
| Focus | Complete/cancel | Correct terminal state; no duplicate completion; linked data refreshes | Pending | |
| Break | Short/long break | Correct break is selected and restored after app restart | Pending | |
| Notification | Grant permission | Permission appears only after explicit Settings action | Pending | |
| Notification | Focus completion | Fires at expected end; tap opens Focus | Pending | |
| Notification | Pause/resume | Old notification is cancelled; only rescheduled one fires | Pending | |
| Notification | Cancel/complete | Stale focus notification never fires | Pending | |
| Notification | Break completion | Fires at break end; tap opens Focus | Pending | |
| Notification | Habit DAILY/WEEKDAYS | Fires on configured time/day; tap opens Habits | Pending | |
| Notification | Deny permission | No crash/re-prompt loop; Settings offers OS settings | Pending | |
| Network | Disconnect/reconnect idle | Offline banner appears; cached data remains; queries recover | Pending | |
| Network | Disconnect/reconnect active timer | Timer display remains timestamp-based; no second active session | Pending | |
| Errors | API 4xx/5xx/timeout | Actionable Vietnamese message; no raw Java exception | Pending | |
| Accessibility | Font scale + screen reader | Timer/progress/actions have useful labels; layout remains usable | Pending | |
| Keyboard | Auth/create/edit forms | Focus order, submit and keyboard avoidance work | Pending | |

## Release gate

- [ ] No Critical/High device-test failures remain.
- [ ] Notification timing tested once with screen locked.
- [ ] Timer tested once across app process termination/reopen.
- [ ] Network recovery tested during an active session.
- [ ] Device/OS/build evidence is recorded above.
- [ ] Android or iOS is only called “device verified” for the platform actually tested.
