import { useEffect, useState } from 'react';
import type { Calibration, ExerciseSettings } from './types';
import { loadCalibration, loadSettings, saveCalibration, saveSettings } from './lib/storage';
import HomeScreen from './screens/HomeScreen';
import CalibrationScreen from './screens/CalibrationScreen';
import SettingsScreen from './screens/SettingsScreen';
import ExerciseScreen from './screens/ExerciseScreen';
import LetterTestScreen from './screens/LetterTestScreen';
import FixationDrillScreen from './screens/FixationDrillScreen';
import ProgressScreen from './screens/ProgressScreen';
import LogScreen from './screens/LogScreen';

export type Screen =
  | 'home'
  | 'calibration'
  | 'settings'
  | 'exercise'
  | 'letter-test'
  | 'fixation-drill'
  | 'progress'
  | 'log';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [calibration, setCalibration] = useState<Calibration | null>(loadCalibration);
  const [settings, setSettings] = useState<ExerciseSettings>(loadSettings);

  useEffect(() => {
    document.body.classList.toggle('light', settings.polarity === 'light');
  }, [settings.polarity]);

  const updateCalibration = (cal: Calibration) => {
    if (!saveCalibration(cal)) {
      alert('Could not save the calibration on this device (storage full or restricted).');
    }
    setCalibration(cal);
  };

  const updateSettings = (s: ExerciseSettings) => {
    if (!saveSettings(s)) {
      alert('Could not save the settings on this device (storage full or restricted).');
    }
    setSettings(s);
  };

  const goHome = () => setScreen('home');

  // Every exercise requires calibration; fall back to home (which offers it).
  if (
    (screen === 'exercise' || screen === 'letter-test' || screen === 'fixation-drill') &&
    !calibration
  ) {
    return <HomeScreen calibrated={false} onNavigate={setScreen} />;
  }

  switch (screen) {
    case 'calibration':
      return (
        <CalibrationScreen
          calibration={calibration}
          onSave={(cal) => {
            updateCalibration(cal);
            goHome();
          }}
          onBack={goHome}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          settings={settings}
          calibration={calibration}
          onSave={(s) => {
            updateSettings(s);
            goHome();
          }}
          onBack={goHome}
        />
      );
    case 'exercise':
      return (
        <ExerciseScreen settings={settings} calibration={calibration!} onExit={goHome} />
      );
    case 'letter-test':
      return (
        <LetterTestScreen settings={settings} calibration={calibration!} onExit={goHome} />
      );
    case 'fixation-drill':
      return (
        <FixationDrillScreen
          settings={settings}
          calibration={calibration!}
          onExit={goHome}
        />
      );
    case 'progress':
      return <ProgressScreen onBack={goHome} />;
    case 'log':
      return <LogScreen onBack={goHome} />;
    default:
      return <HomeScreen calibrated={calibration !== null} onNavigate={setScreen} />;
  }
}