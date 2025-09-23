class VoiceService {
  private synth: SpeechSynthesis;
  private italianVoices: SpeechSynthesisVoice[] = [];
  private currentVoiceIndex: number = 0;
  private allVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();

    // Reload voices when they change
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
        // Try to set Google italiano as default if not already set
        if (!this.selectedVoice) {
          this.setDefaultVoice();
        }
      };
    }

    // Set default voice after a short delay to ensure voices are loaded
    setTimeout(() => this.setDefaultVoice(), 500);
  }

  private setDefaultVoice() {
    // Look for Google italiano voice
    const googleItaliano = this.allVoices.find(voice =>
      voice.name.toLowerCase().includes('google') &&
      voice.name.toLowerCase().includes('italiano')
    );

    if (googleItaliano) {
      this.selectedVoice = googleItaliano;
      console.log('Default voice set to:', googleItaliano.name);
    }
  }

  private loadVoices() {
    const voices = this.synth.getVoices();
    this.allVoices = voices;

    // Find all Italian voices
    this.italianVoices = voices.filter(voice =>
      voice.lang.startsWith('it-IT') || voice.lang.startsWith('it')
    );

    // If no Italian voices, try other Romance languages for variety
    if (this.italianVoices.length === 0) {
      this.italianVoices = voices.filter(voice =>
        voice.lang.startsWith('es') || // Spanish
        voice.lang.startsWith('fr') || // French
        voice.lang.startsWith('pt')    // Portuguese
      );
    }

    // If still no voices, use ALL available voices as fallback
    if (this.italianVoices.length === 0 && voices.length > 0) {
      this.italianVoices = voices;
      console.log('No Italian/Romance voices found, using all available voices');
    }

    console.log('Total voices available:', voices.length);
    console.log('Selected voices:', this.italianVoices.map(v => `${v.name} (${v.lang})`));

    // Return the voices for external use
    return voices;
  }

  private getNextVoice(): SpeechSynthesisVoice | null {
    if (this.italianVoices.length === 0) return null;

    // Rotate through available voices for variety
    const voice = this.italianVoices[this.currentVoiceIndex];
    this.currentVoiceIndex = (this.currentVoiceIndex + 1) % this.italianVoices.length;
    return voice;
  }

  private getRandomVoice(): SpeechSynthesisVoice | null {
    if (this.italianVoices.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.italianVoices.length);
    return this.italianVoices[randomIndex];
  }

  getAllVoices(): SpeechSynthesisVoice[] {
    // Always get fresh voices
    const voices = this.synth.getVoices();
    this.allVoices = voices;
    return voices;
  }

  setSelectedVoice(voiceName: string) {
    const voice = this.allVoices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      console.log('Selected voice:', voice.name);
    }
  }

  speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    useRandomVoice?: boolean;
    cancelPrevious?: boolean;
  } = {}) {
    // Chrome bug workaround: ALWAYS cancel to clear stuck queue
    this.synth.cancel();

    // Chrome bug workaround: Resume in case it's paused
    this.synth.resume();

    // Delay to let cancel complete
    setTimeout(() => {
      // Create the utterance with text in constructor
      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice - try to get any voice that works
      if (this.selectedVoice) {
        console.log('Using selected voice:', this.selectedVoice.name);
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang;
      } else {
        // Get fresh voices list
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
          // Just use the first available voice if no selection
          const voice = voices[0];
          console.log('Using first available voice:', voice.name);
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          console.log('No voices available, using browser default');
        }
      }

      // Set speech parameters - ensure volume is not zero
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;

      // Log the actual values being used
      console.log(`Speech params - Rate: ${utterance.rate}, Pitch: ${utterance.pitch}, Volume: ${utterance.volume}`);

      // Add event handlers for debugging
      utterance.onstart = () => {
        console.log('✅ Speech STARTED:', text);
      };

      utterance.onend = () => {
        console.log('✅ Speech ENDED:', text);
      };

      utterance.onerror = (event) => {
        console.error('❌ Speech ERROR:', event.error, 'for text:', text);
      };

      console.log('Attempting to speak:', text);
      console.log('Voice selected:', utterance.voice?.name || 'browser default');

      // Speak
      this.synth.speak(utterance);
      console.log('Utterance queued');

      // Chrome workaround: Resume after speaking to ensure it runs
      setTimeout(() => {
        this.synth.resume();
      }, 10);
    }, 50);
  }

  speakCardName(cardName: string) {
    console.log('Speaking card name:', cardName);
    this.speak(cardName, {
      rate: 0.9,
      pitch: 1.0,
      useRandomVoice: false
    });
  }

  speakRoundIntro(round: number, player1Card: string, player2Card: string, ability?: string) {
    let text = `${player1Card} contro ${player2Card}`;
    if (ability) {
      const abilityText = ability === 'strength' ? 'forza' :
                         ability === 'speed' ? 'velocità' :
                         ability === 'agility' ? 'agilità' : ability;
      text += `. Prova di ${abilityText}`;
    }
    this.speak(text, {
      rate: 0.75,
      pitch: 1.1 + Math.random() * 0.2,
      useRandomVoice: false
    });
  }

  speakRoundResult(player1Total: number, player2Total: number, winnerCard: string) {
    const text = `${player1Total} a ${player2Total}. ${winnerCard} vince!`;
    this.speak(text, {
      rate: 0.85,
      pitch: 1.3 + Math.random() * 0.2,
      volume: 1.0,
      useRandomVoice: true
    });
  }

  speakBattleStart() {
    const battleCries = [
      'Battaglia!',
      'Combattimento!',
      'Inizia lo scontro!',
      'Che la battaglia abbia inizio!'
    ];
    const cry = battleCries[Math.floor(Math.random() * battleCries.length)];
    this.speak(cry, {
      rate: 0.7,
      pitch: 1.4,
      volume: 1.0,
      useRandomVoice: true,
      cancelPrevious: true
    });
  }

  speakBattleComplete(winner: string) {
    const victoryPhrases = [
      `Vittoria! ${winner} è il campione!`,
      `${winner} ha vinto!`,
      `Trionfo per ${winner}!`,
      `${winner} è vittorioso!`
    ];
    const phrase = victoryPhrases[Math.floor(Math.random() * victoryPhrases.length)];
    this.speak(phrase, {
      rate: 0.8,
      pitch: 1.2 + Math.random() * 0.2,
      useRandomVoice: true
    });
  }

  stop() {
    this.synth.cancel();
  }

  // Debug method to list all available voices
  listVoices() {
    const voices = this.synth.getVoices();
    console.log('=== ALL AVAILABLE VOICES ===');
    voices.forEach(voice => {
      console.log(`${voice.name} (${voice.lang}) - ${voice.localService ? 'Local' : 'Remote'}`);
    });
    console.log('=== ITALIAN/ROMANCE VOICES SELECTED ===');
    this.italianVoices.forEach(voice => {
      console.log(`${voice.name} (${voice.lang})`);
    });
  }
}

// Create singleton instance
const voiceService = new VoiceService();

// Ensure voices are loaded when the page loads
if (typeof window !== 'undefined') {
  // Load voices immediately
  const loadInitialVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('Initial voice load - found', voices.length, 'voices');
    if (voices.length === 0) {
      // Try again if no voices loaded yet
      setTimeout(loadInitialVoices, 100);
    } else {
      voiceService.listVoices();
    }
  };

  // Some browsers need a user interaction first
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      console.log('Voices changed event fired');
      loadInitialVoices();
    };
  }

  loadInitialVoices();
}

export default voiceService;