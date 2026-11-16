export default function Footer() {
  return (
    <footer className="site-footer shell">
      <a className="footer-name" href="#top">
        Prathmesh Pawar <span>↗</span>
      </a>
      <p>Thoughtfully engineered. Always evolving.</p>
      <span className="mono">
        © {new Date().getFullYear()} / LEICESTER, UK
      </span>
    </footer>
  );
}
