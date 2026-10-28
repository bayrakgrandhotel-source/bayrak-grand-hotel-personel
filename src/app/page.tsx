
"use client";

import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="hotel-icon">BG</div>
        <h1>Bayrak Grand Hotel</h1>
        <p>Personel Takip Sistemi</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Giriş sistemi henüz bağlanmadı. Sonraki adımda Supabase bağlantısını kuracağız.");
          }}
        >
          <label htmlFor="username">Kullanıcı adı</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Kullanıcı adınızı girin"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifrenizi girin"
            autoComplete="current-password"
            required
          />

          <button type="submit">Giriş Yap</button>
        </form>

        <small>Güvenli Personel Giriş Sistemi</small>
      </section>
    </main>
  );
}

