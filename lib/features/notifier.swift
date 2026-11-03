// Task-notify helper: posts one UNUserNotificationCenter notification and exits;
// when macOS launches it because the user clicked a notification, it brings the
// DeepSeek Harness app forward instead.
import AppKit
import UserNotifications

struct Options {
  var post = false
  var title = "DeepSeek Harness"
  var subtitle = ""
  var message = ""
  var sound = true
  var bundleId = "com.deepseek.dsh"
  var log = ""
  var id = ""
}

func openApp(_ bundleId: String) {
  let running = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId)
  if let app = running.first {
    app.activate(options: [.activateAllWindows])
    return
  }
  guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) else { return }
  let configuration = NSWorkspace.OpenConfiguration()
  configuration.activates = true
  NSWorkspace.shared.openApplication(at: url, configuration: configuration) { _, _ in }
}

func appendLog(_ path: String, _ id: String, _ line: String) {
  guard !path.isEmpty else { return }
  let stamp = ISO8601DateFormatter().string(from: Date())
  let text = "\(stamp) [\(id)] \(line)\n"
  if let handle = FileHandle(forWritingAtPath: path) {
    handle.seekToEndOfFile()
    handle.write(Data(text.utf8))
    try? handle.close()
  } else {
    try? text.write(toFile: path, atomically: true, encoding: .utf8)
  }
}

func parse(_ argv: [String]) -> Options {
  var options = Options()
  var index = 1
  while index < argv.count {
    let key = argv[index]
    let value = index + 1 < argv.count ? argv[index + 1] : ""
    switch key {
    case "--post": options.post = true
    case "--title": options.title = value; index += 1
    case "--subtitle": options.subtitle = value; index += 1
    case "--message": options.message = value; index += 1
    case "--silent": options.sound = false
    case "--bundle": options.bundleId = value; index += 1
    case "--log": options.log = value; index += 1
    case "--id": options.id = value; index += 1
    default: break
    }
    index += 1
  }
  return options
}

final class Delegate: NSObject, UNUserNotificationCenterDelegate {
  let bundleId: String
  let log: String
  let id: String
  init(bundleId: String, log: String, id: String) { self.bundleId = bundleId; self.log = log; self.id = id }
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .sound])
  }
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    appendLog(log, id, "clicked → activating \(bundleId)")
    openApp(bundleId)
    completionHandler()
    exit(0)
  }
}

let options = parse(CommandLine.arguments)
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
// Make the icon explicit too: the bundle carries it, and setting it stops a
// stale LaunchServices icon cache from showing a placeholder in the banner.
if let iconPath = Bundle.main.path(forResource: "TaskNotify", ofType: "icns"),
   let icon = NSImage(contentsOfFile: iconPath) {
  NSApplication.shared.applicationIconImage = icon
}
let delegate = Delegate(bundleId: options.bundleId, log: options.log, id: options.id)
let center = UNUserNotificationCenter.current()
center.delegate = delegate

if !options.post {
  // Launched by the user clicking a notification: bring dsh forward and quit.
  appendLog(options.log, options.id, "launched without --post: activating \(options.bundleId)")
  openApp(options.bundleId)
  exit(0)
}

center.requestAuthorization(options: [.alert, .sound]) { granted, error in
  appendLog(options.log, options.id, "authorization granted=\(granted) error=\(error?.localizedDescription ?? "none")")
  guard granted else { exit(2) }
  let content = UNMutableNotificationContent()
  content.title = options.title
  content.subtitle = options.subtitle
  content.body = options.message
  if options.sound { content.sound = .default }
  let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
  center.add(request) { addError in
    appendLog(options.log, options.id, "add error=\(addError?.localizedDescription ?? "none")")
    center.getDeliveredNotifications { delivered in
      appendLog(options.log, options.id, "delivered=\(delivered.count)")
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { exit(0) }
    }
  }
}
app.run()
