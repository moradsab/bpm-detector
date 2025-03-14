
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.bufferSize = 1024;
      this.buffer = new Float32Array(this.bufferSize);
      this.bufferFilled = 0;
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      
      if (input && input.length > 0 && input[0].length > 0) {
        const channelData = input[0];
        
        // Fill our buffer
        for (let i = 0; i < channelData.length; i++) {
          if (this.bufferFilled < this.bufferSize) {
            this.buffer[this.bufferFilled++] = channelData[i];
          }
        }
        
        // If buffer is full, send it to the main thread
        if (this.bufferFilled >= this.bufferSize) {
          this.port.postMessage({
            audioData: this.buffer.slice(0)
          });
          this.bufferFilled = 0;
        }
      }
      
      // Return true to keep the processor running
      return true;
    }
  }
  
  
  registerProcessor('audio-processor', AudioProcessor);