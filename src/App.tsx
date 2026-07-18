import { useEffect, useState } from 'react';
import type { Calibration, ExerciseSettings } from './types';
import { loadCalibration, loadSettings, saveCalibration, saveSettings } from './lib/storage';
import HomeScreen from './screens/HomeScreen';
import CalibrationScreen from './screens/CalibrationScreen';
import SettingsScreen from './screens/SettingsScreen';
import ExerciseScreen from './screens/ExerciseScreen';
import LogScreen from './screens/LogScreen';

export type Screen = 'home' | 'calibration' | 'settings' | 'exercise' | 'log';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [calibration, setCalibration] = useState<Calibration | null>(loadCalibration);
  const [settings, setSettings] = useState<ExerciseSettings>(loadSettings);

  useEffect(() => {
    document.body.classList.toggle('light', settings.polarity === 'light');
  }, [settings.polarity]);

  const updateCalibration = (cal: Calibration) => {
    saveCalibration(cal);
    setCalibration(cal);
  };

  const updateSettings = (s: ExerciseSettings) => {
    saveSettings(s);
    setSettings(s);
  };

  switch (screen) {
    case 'calibration':
      return (
        <CalibrationScreen
          calibration={calibration}
          onSave={(cal) => {
            updateCalibration(cal);
            setScreen('home');
          }}
          onBack={() => setScreen('home')}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          settings={settings}
          calibration={calibration}
          onSave={(s) => {
            updateSettings(s);
            setScreen('home');
          }}
          onBack={() => setScreen('home')}
        />
      );
    case 'exercise':
      return calibration ? (
        <ExerciseScreen
          settings={settings}
          calibration={calibration}
          onExit={() => setScreen('home')}
        />
      ) : (
        <HomeScreen calibrated={false} onNavigate={setScreen} />
      );
    case 'log':
      return <LogScreen onBack={() => setScreen('home')} />;
    default:
      return <HomeScreen calibrated={calibration !== null} onNavigate={setScreen} />;
  }
}
