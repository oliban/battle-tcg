import React, { useState, useEffect } from 'react';
import './SimpleDice.css';

interface SimpleDiceProps {
  value: number;  // The actual dice value to display (1-6)
  isRolling: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  player?: string;
}

const SimpleDice: React.FC<SimpleDiceProps> = ({
  value,
  isRolling,
  size = 'medium',
  color = '#fff',
  player = 'Unknown'
}) => {
  // During rolling, show random values. When stopped, show the actual value.
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRolling) {
      // Show random values while rolling
      interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
    } else {
      // When rolling stops, immediately show the actual value
      setDisplayValue(value);
      console.log(`[SimpleDice ${player}] Stopped rolling - showing value: ${value}`);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRolling, value, player]);

  // Simple dot patterns for each face
  const renderDots = () => {
    switch (displayValue) {
      case 1:
        return (
          <div className="dice-dots">
            <div className="dot center"></div>
          </div>
        );
      case 2:
        return (
          <div className="dice-dots">
            <div className="dot top-left"></div>
            <div className="dot bottom-right"></div>
          </div>
        );
      case 3:
        return (
          <div className="dice-dots">
            <div className="dot top-left"></div>
            <div className="dot center"></div>
            <div className="dot bottom-right"></div>
          </div>
        );
      case 4:
        return (
          <div className="dice-dots">
            <div className="dot top-left"></div>
            <div className="dot top-right"></div>
            <div className="dot bottom-left"></div>
            <div className="dot bottom-right"></div>
          </div>
        );
      case 5:
        return (
          <div className="dice-dots">
            <div className="dot top-left"></div>
            <div className="dot top-right"></div>
            <div className="dot center"></div>
            <div className="dot bottom-left"></div>
            <div className="dot bottom-right"></div>
          </div>
        );
      case 6:
        return (
          <div className="dice-dots">
            <div className="dot top-left"></div>
            <div className="dot top-right"></div>
            <div className="dot middle-left"></div>
            <div className="dot middle-right"></div>
            <div className="dot bottom-left"></div>
            <div className="dot bottom-right"></div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`simple-dice-container ${size}`}>
      <div
        className={`simple-dice ${isRolling ? 'rolling' : ''}`}
        style={{ backgroundColor: color }}
      >
        {renderDots()}
      </div>
    </div>
  );
};

export default SimpleDice;