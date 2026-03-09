import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ProgressRing } from '../ProgressRing';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => React.createElement(View, props, children),
    Svg: ({ children, ...props }: any) => React.createElement(View, props, children),
    Circle: (props: any) => React.createElement(View, props),
  };
});

describe('ProgressRing', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <ProgressRing progress={0.5} size={200} strokeWidth={12} color="#D85E43" />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders children inside the ring', () => {
    render(
      <ProgressRing progress={0.75} size={200} strokeWidth={12} color="#D85E43">
        <Text>15:00</Text>
      </ProgressRing>
    );

    const { getByText } = render(
      <ProgressRing progress={0.75} size={200} strokeWidth={12} color="#D85E43">
        <Text>15:00</Text>
      </ProgressRing>
    );

    expect(getByText('15:00')).toBeTruthy();
  });

  it('accepts progress from 0 to 1', () => {
    // Progress = 0 (empty)
    const { toJSON: json0 } = render(
      <ProgressRing progress={0} size={200} strokeWidth={12} color="#D85E43" />
    );
    expect(json0()).toBeTruthy();

    // Progress = 1 (full)
    const { toJSON: json1 } = render(
      <ProgressRing progress={1} size={200} strokeWidth={12} color="#D85E43" />
    );
    expect(json1()).toBeTruthy();
  });

  it('accepts custom bgColor', () => {
    const { toJSON } = render(
      <ProgressRing
        progress={0.5}
        size={200}
        strokeWidth={12}
        color="#D85E43"
        bgColor="rgba(0,0,0,0.1)"
      />
    );
    expect(toJSON()).toBeTruthy();
  });
});
