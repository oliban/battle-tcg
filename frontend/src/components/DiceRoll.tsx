import React, { useState, useEffect } from 'react';
import './DiceRoll.css';

interface DiceRollProps {
  value?: number;
  isRolling: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const DiceRoll: React.FC<DiceRollProps> = ({
  value,
  isRolling,
  size = 'medium',
  color = '#fff'
}) => {
  const [currentValue, setCurrentValue] = useState(1);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);

  useEffect(() => {
    if (isRolling) {
      // Start rolling animation
      const interval = setInterval(() => {
        setCurrentValue(Math.floor(Math.random() * 6) + 1);
        setRotationX(Math.random() * 720 - 360);
        setRotationY(Math.random() * 720 - 360);
      }, 100);

      return () => clearInterval(interval);
    } else if (value) {
      // Set final value with a nice rotation
      setCurrentValue(value);
      setRotationX(0);
      setRotationY(0);
    }
  }, [isRolling, value]);

  const getDots = (num: number) => {
    const dotPositions: { [key: number]: string[] } = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };

    return dotPositions[num] || [];
  };

  return (
    <div className={`dice-container ${size}`}>
      <div
        className={`dice ${isRolling ? 'rolling' : 'settled'}`}
        style={{
          transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
          backgroundColor: color
        }}
      >
        <div className="dice-face">
          {getDots(currentValue).map((position, index) => (
            <div key={index} className={`dot ${position}`} />
          ))}
        </div>
      </div>
      {!isRolling && value && (
        <div className="dice-value">{value}</div>
      )}
    </div>
  );
};

export default DiceRoll;