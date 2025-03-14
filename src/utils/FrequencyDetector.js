import React, { useState, useEffect } from "react";

export default function FrequencyDetector() {
  const [frequency, setFrequency] = useState(null);
  const [category, setCategory] = useState("");

  useEffect(() => {
    let audioContext, analyser, microphone, dataArray;

    async function startAudioProcessing() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        function analyzeFrequency() {
          analyser.getByteFrequencyData(dataArray);
          let maxIndex = dataArray.indexOf(Math.max(...dataArray));
          let sampleRate = audioContext.sampleRate;
          let dominantFrequency = (maxIndex * sampleRate) / analyser.fftSize;

          setFrequency(Math.round(dominantFrequency));
          setCategory(getCategory(dominantFrequency));

          requestAnimationFrame(analyzeFrequency);
        }

        analyzeFrequency();
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    }

    startAudioProcessing();

    return () => {
      audioContext && audioContext.close();
    };
  }, []);

  function getCategory(freq) {
    if (freq < 50) return "Low Bass (LFE)";
    if (freq < 100) return "Musical Bass (Kick Drum, Bass Guitar)";
    if (freq < 200) return "Upper Bass (Lowest Male Vocals)";
    if (freq < 5000) return "Midrange (Dialog, Instruments, Effects)";
    return "Treble (Cymbals, High Speech Sounds)";
  }

  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl font-bold">Frequency Detector</h1>
      <p className="mt-2 text-lg">Listening...</p>
      {frequency && (
        <>
          <p className="text-xl mt-4">Detected Frequency: {frequency} Hz</p>
          <p className="text-2xl font-bold text-blue-500">{category}</p>
        </>
      )}
    </div>
  );
}
