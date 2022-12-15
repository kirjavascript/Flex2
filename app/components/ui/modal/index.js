import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

export function Modal({ spring, children, className = '' }) {
    const isOpen = spring.opacity === 1; // naughty, but nice API
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
        }
    }, [isOpen]);

    const styles = useSpring({
        to: spring,
        onRest: () => {
            if (!isOpen) {
                setShouldRender(false);
            }
        },
    });

    if (!shouldRender) return false;

    return (
        <animated.div style={styles} className={`modal ${className}`}>
            {children}
        </animated.div>
    );
};
