import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  /** Changing this (the route path) clears a caught error, so navigating away always recovers. */
  resetKey: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  key: string;
}

/** Catches render errors in one page so the header, nav and other pages keep working. */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Page error", error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card error-card" role="alert">
        <h1>This page hit an error</h1>
        <p className="muted">Something on this page did not load correctly. The rest of the site still works.</p>
        <p className="muted small-text">{this.state.error.message}</p>
        <p>
          <Link className="btn" to={this.props.resetKey} onClick={this.retry}>
            Try again
          </Link>{" "}
          <Link to="/">Go to Predict</Link>
        </p>
      </div>
    );
  }
}
