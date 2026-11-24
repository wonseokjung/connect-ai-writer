// prints the faces (and, if none, the people) in an image as JSON boxes, 0..1 from the top-left. macOS only (Vision).
import Foundation
import Vision
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let h = VNImageRequestHandler(url: url, options: [:])
let faces = VNDetectFaceRectanglesRequest()
let people = VNDetectHumanRectanglesRequest()
try? h.perform([faces, people])
func box(_ o: VNDetectedObjectObservation) -> String {
  let b = o.boundingBox
  return String(format: "{\"x\":%.4f,\"y\":%.4f,\"w\":%.4f,\"h\":%.4f}", b.minX, 1 - b.maxY, b.width, b.height)
}
let f = (faces.results ?? []).map(box).joined(separator: ",")
let p = (people.results ?? []).map(box).joined(separator: ",")
print("{\"faces\":[\(f)],\"people\":[\(p)]}")
