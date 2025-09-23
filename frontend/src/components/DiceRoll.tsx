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
  const [animationValue, setAnimationValue] = useState(1);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);

  // Animation effect - only handles the rolling animation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRolling) {
      // Start rolling animation
      interval = setInterval(() => {
        setAnimationValue(Math.floor(Math.random() * 6) + 1);
        setRotationX(Math.random() * 720 - 360);
        setRotationY(Math.random() * 720 - 360);
      }, 100);
    } else {
      // Stop animation
      setRotationX(0);
      setRotationY(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRolling]);

  // Get dot positions for a given number
  const getDots = (num: number) => {
    const dotPositions: { [key: number]: string[] } = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };

    return dotPositions[num] || dotPositions[1];
  };

  // CRITICAL: Determine what to display
  // When rolling: show animation value
  // When not rolling AND we have a value: show that value
  // No fallback - only show if we have a valid value
  let displayNumber: number | null = null;
  if (isRolling) {
    displayNumber = animationValue;
  } else if (value !== undefined && value >= 1 && value <= 6) {
    displayNumber = value;
  }

  // Debug logging
  if (!isRolling && value) {
    console.log(`Dice stopped - Final value: ${value}, Displaying: ${displayNumber}`);
  }

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
          {displayNumber !== null && getDots(displayNumber).map((position, index) => (
            <div key={`${position}-${index}`} className={`dot ${position}`} />
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