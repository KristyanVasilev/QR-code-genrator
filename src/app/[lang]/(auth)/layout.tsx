export default function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div className="container auth-wrap">
      <div className="auth-shell">
        <div className="card auth-card">{children}</div>
      </div>
    </div>
  );
}
