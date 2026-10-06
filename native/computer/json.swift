import Foundation

struct Request {
  let id: String
  let method: String
  let params: [String: Any]
}

func parseRequest(_ line: String) -> Request? {
  guard let data = line.data(using: .utf8) else { return nil }
  guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
  guard let method = object["method"] as? String else { return nil }
  let id = jsonString(object["id"]) ?? ""
  let params = object["params"] as? [String: Any] ?? [:]
  return Request(id: id, method: method, params: params)
}

func okResponse(id: String, result: Any) -> String {
  encode(["id": id, "ok": true, "result": result])
}

func errorResponse(id: String, message: String) -> String {
  encode(["id": id, "ok": false, "error": message])
}

func encode(_ object: [String: Any]) -> String {
  guard let data = try? JSONSerialization.data(withJSONObject: object) else {
    return #"{"id":"","ok":false,"error":"Could not encode a response."}"#
  }
  return String(data: data, encoding: .utf8) ?? #"{"id":"","ok":false,"error":"Could not encode a response."}"#
}

func jsonString(_ value: Any?) -> String? {
  if let text = value as? String { return text }
  if let number = value as? NSNumber { return number.stringValue }
  return nil
}

func jsonInt(_ value: Any?) -> Int? {
  if let number = value as? NSNumber { return number.intValue }
  return nil
}

func jsonDouble(_ value: Any?) -> Double? {
  if let number = value as? NSNumber { return number.doubleValue }
  return nil
}
