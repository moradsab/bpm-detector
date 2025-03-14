import numpy as np
from collections import deque
import time

class BPMDetector:
    def __init__(self):
        # Energy threshold settings
        self.energy_threshold = 0.1
        self.smoothing_factor = 0.9
        # Ignore beats detected too close together more than 180 bpm
        self.min_interval = 0.3

        # BPM smoothing to avoid sudden jumps
        self.last_bpm = None
        self.bpm_smoothing = 0.9
        self.beat_times = deque(maxlen=10)

    def _calculate_rms(self, audio_chunk):
        """Compute RMS (Root Mean Square) energy of the audio chunk."""
        return np.sqrt(np.mean(np.square(audio_chunk)))
    
    def _low_pass_filter(self, energy):
        """Low-pass filter to reduce noise."""
        self.energy_threshold = self.smoothing_factor * self.energy_threshold + (1 - self.smoothing_factor) * energy
        return self.energy_threshold
    
    def _smooth_bpm(self, bpm):
        """Smooth BPM calculation to prevent rapid variations."""
        if self.last_bpm is None:
            self.last_bpm = bpm
        else:
            self.last_bpm = self.bpm_smoothing * self.last_bpm + (1 - self.bpm_smoothing) * bpm
        return self.last_bpm
    
    def process_audio_chunk(self, audio_data):
        try:
            # Convert raw audio bytes to a normalized numpy array
            audio_chunk = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Compute energy and update the threshold
            energy = self._calculate_rms(audio_chunk)
            threshold = self._low_pass_filter(energy)
            
            # Beat detection: energy must be significantly higher than threshold
            if energy > threshold * 1.5:
                current_time = time.time()
                
                # Ignore beats that are too close together (likely noise)
                if self.beat_times and (current_time - self.beat_times[-1]) < self.min_interval:
                    return None
                
                # Compute BPM if we have at least one previous beat
                if self.beat_times:
                    interval = current_time - self.beat_times[-1]
                    bpm = 60 / interval
                    self.beat_times.append(current_time)
                    return round(self._smooth_bpm(bpm), 1)
                else:
                    self.beat_times.append(current_time)  # Store first beat
            
            return None
        except Exception as e:
            print(f"Error: {e}")
            return None
