import { render } from 'preact';

function App() {
  return (
    <div>
      <h1>Hello World</h1>
      <p>Welcome to CFGuard Preact App!</p>
    </div>
  );
}

render(<App />, document.getElementById('app')!);