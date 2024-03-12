const video = document.getElementById("video");
const logDiv = document.getElementById("log");

let isUserActive = true; // Variable to track user activity

// Function to handle visibility change
function handleVisibilityChange() {
  if (document.visibilityState === "hidden") {
    // User switched to another tab or minimized the window
    isUserActive = false;
    logDiv.innerText = "User is not active on the website.";
    console.log("User is not active on the website.");
    // You can perform actions here, such as pausing video processing or tracking user activity.
  } else {
    // User is active on the website
    isUserActive = true;
    // logDiv.innerText = "User is active on the website.";
    console.log("User is active on the website.");
    // You can resume video processing or tracking user activity.
  }
}

// Listen for visibility change events
document.addEventListener("visibilitychange", handleVisibilityChange);

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((err) => console.error("Error accessing camera:", err));
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  let lastTilt = null; // Variable to store the previous tilt angle
  let lastTurn = null; // Variable to store the previous turn angle

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    if (resizedDetections.length > 0) {
      const landmarks = resizedDetections[0].landmarks;

      // Calculate angles
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();
      const mouth = landmarks.getMouth();

      const eyeDist = Math.sqrt(
        Math.pow(rightEye[0]._x - leftEye[3]._x, 2) +
          Math.pow(rightEye[0]._y - leftEye[3]._y, 2)
      );
      const tiltAngle =
        Math.atan((nose[0]._y - mouth[0]._y) / eyeDist) * (180 / Math.PI);
      const turnAngle =
        Math.atan(
          (rightEye[3]._y - leftEye[0]._y) / (rightEye[3]._x - leftEye[0]._x)
        ) *
        (180 / Math.PI);

      // Check if this is not the first frame and if the angles changed significantly
      if (lastTilt !== null && lastTurn !== null) {
        const tiltChange = Math.abs(tiltAngle - lastTilt);
        const turnChange = Math.abs(turnAngle - lastTurn);

        // If the tilt angle or turn angle changed significantly, consider it as head tilt or turn
        if (tiltChange > 2 || turnChange > 2) {
          console.log("User tilted head or turned to the side");
          // Here you can increment a counter or perform any action you want
        }
      }

      // Update previous angles
      lastTilt = tiltAngle;
      lastTurn = turnAngle;

      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    }
  }, 100);
});
