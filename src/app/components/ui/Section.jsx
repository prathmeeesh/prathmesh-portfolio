export default function Section({ id, kicker, title, subtitle, children }) {
  return (
    <section id={id} className="section shell" aria-labelledby={id + "-title"}>
      <div className="section-heading">
        <p className="eyebrow">{kicker}</p>
        <div>
          <h2 id={id + "-title"}>{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
