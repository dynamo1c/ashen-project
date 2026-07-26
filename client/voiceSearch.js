/**
 * AshenVoiceSearch - Web Speech API wrapper for Ashen Protocol Copilot
 * Supports en-IN, hi-IN, and kn-IN voice recognition with interim/final callbacks.
 */
class AshenVoiceSearch {
  constructor(options = {}) {
    this.lang = options.lang || 'en-IN';
    this.onInterim = options.onInterim || (() => {});
    this.onFinal = options.onFinal || (() => {});
    this.onError = options.onError || (() => {});
    this.onStateChange = options.onStateChange || (() => {});

    this.recognition = null;
    this.isListening = false;

    // Feature detect Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.lang;

      // Handle speech start
      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange('listening');
      };

      // Handle raw speech results
      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (interimTranscript) {
          this.onInterim(interimTranscript);
        }
        if (finalTranscript) {
          this.onFinal(finalTranscript);
        }
      };

      // Handle recognition errors
      this.recognition.onerror = (event) => {
        let message = 'Speech recognition error';
        
        switch (event.error) {
          case 'no-speech':
            message = 'No speech detected';
            break;
          case 'audio-capture':
            message = 'No microphone found';
            break;
          case 'not-allowed':
            message = 'Microphone permission denied';
            break;
          case 'network':
            message = 'Network error';
            break;
          case 'language-not-supported':
            message = 'Language not supported';
            break;
          default:
            message = `Speech error: ${event.error}`;
        }
        
        this.onError(message);
      };

      // Handle speech stop/end
      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange('idle');
      };
    }
  }

  /**
   * Updates the recognition language
   * @param {string} langCode - e.g. 'en-IN', 'hi-IN', 'kn-IN'
   */
  setLanguage(langCode) {
    this.lang = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
      console.log(`[VoiceSearch] Language changed to: ${langCode}`);
    }
  }

  /**
   * Starts capturing audio
   */
  start() {
    if (!this.isSupported()) {
      this.onError('Browser does not support speech recognition');
      return;
    }

    if (!this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        this.onError('Failed to start recording');
      }
    }
  }

  /**
   * Stops capturing audio
   */
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Checks if browser supports SpeechRecognition
   * @returns {boolean}
   */
  isSupported() {
    return !!this.recognition;
  }
}
