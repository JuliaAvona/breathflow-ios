# Testing Guide

This project uses **Jest** and **React Native Testing Library** for testing.

## Setup

First, install the testing dependencies:

```bash
npm install
```

The following testing packages are included:
- `jest` - Test runner
- `jest-expo` - Expo preset for Jest
- `@testing-library/react-native` - Testing utilities for React Native components
- `@testing-library/jest-native` - Custom matchers for React Native
- `@types/jest` - TypeScript types for Jest

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Structure

Tests are organized in `__tests__` directories next to the code they test:

```
src/
├── components/
│   ├── __tests__/
│   │   ├── BadgeGrid.test.tsx
│   │   └── BadgeUnlockModal.test.tsx
│   ├── BadgeGrid.tsx
│   └── BadgeUnlockModal.tsx
├── store/
│   ├── __tests__/
│   │   └── badgesStore.test.ts
│   └── badgesStore.ts
└── utils/
    ├── __tests__/
    │   └── time.test.ts
    └── time.ts
```

## What's Tested

### Component Tests
- **BadgeGrid** - Badge display grid with locked/unlocked states
- **BadgeUnlockModal** - Modal notifications for badge unlocks

### Store Tests
- **badgesStore** - Badge unlock logic and state management

### Utility Tests
- **time** - Time formatting and date utilities

## Writing Tests

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react-native';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeTruthy();
  });
});
```

### Store Test Example

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useMyStore } from '../myStore';

describe('myStore', () => {
  it('updates state correctly', () => {
    const { result } = renderHook(() => useMyStore());

    act(() => {
      result.current.updateValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

### Utility Test Example

```typescript
import { myUtility } from '../myUtility';

describe('myUtility', () => {
  it('calculates correctly', () => {
    expect(myUtility(10)).toBe(20);
  });
});
```

## Mocked Dependencies

The following dependencies are mocked in `jest.setup.js`:
- `@react-native-async-storage/async-storage`
- `expo-audio`
- `expo-haptics`
- `expo-notifications`
- `react-i18next`
- React Native Animated

## Coverage Goals

Aim for:
- **80%+** line coverage
- **70%+** branch coverage
- **80%+** function coverage

Check coverage with:
```bash
npm run test:coverage
```

## Testing Best Practices

1. **Test behavior, not implementation** - Focus on what users see and interact with
2. **Use descriptive test names** - Make it clear what's being tested
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Keep tests isolated** - Each test should be independent
5. **Mock external dependencies** - Don't rely on network, AsyncStorage, etc.
6. **Test edge cases** - Empty states, error states, boundary conditions

## Debugging Tests

### Run a specific test file
```bash
npm test BadgeGrid.test.tsx
```

### Run a specific test
```bash
npm test -t "renders all badges"
```

### Debug with console.log
Add `console.log()` in your tests and they'll appear in the output.

## CI/CD Integration

Add this to your CI pipeline:
```bash
npm test -- --ci --coverage --maxWorkers=2
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
