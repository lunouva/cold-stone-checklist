import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TRUSTED_TEAMS = ['Creamery teams', 'Cafe operators', 'Franchise owners', 'Shift leads', 'Store closers']

function ProductPreview() {
  const rows = [
    ['Manager walk', 'Temps', '8/10', 'In progress'],
    ['Line close', 'Sanitize', '12/12', 'Done'],
    ['Lobby close', 'Floors', '6/8', 'Assigned'],
    ['Key close', 'Lockup', '3/5', 'Open']
  ]

  return (
    <div className="landing-preview" aria-hidden="true">
      <div className="landing-preview-board">
        <div className="flex items-center justify-between border-b border-sky-100 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-sky-500">Today</p>
            <p className="text-sm font-bold text-sky-950">Store checklist status</p>
          </div>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">87%</span>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr_0.7fr_1fr] border-b border-sky-100 bg-sky-50/70 px-4 py-2 text-[11px] font-semibold text-sky-700">
          <span>Checklist</span>
          <span>Area</span>
          <span>Tasks</span>
          <span>Status</span>
        </div>
        {rows.map(row => (
          <div key={row[0]} className="grid grid-cols-[1.3fr_1fr_0.7fr_1fr] items-center border-b border-sky-50 px-4 py-3 text-xs text-sky-950 last:border-b-0">
            <span className="font-semibold">{row[0]}</span>
            <span className="text-sky-700">{row[1]}</span>
            <span>{row[2]}</span>
            <span className="rounded-md bg-white px-2 py-1 text-center font-semibold text-csc-red shadow-sm">{row[3]}</span>
          </div>
        ))}
      </div>
      <div className="landing-preview-phone">
        <div className="rounded-t-lg bg-csc-red px-3 py-2 text-[11px] font-bold text-white">Operations Checklist</div>
        <div className="space-y-3 p-3">
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-sky-500">Next task</p>
            <p className="text-xs font-bold text-sky-950">Record freezer temp</p>
            <p className="mt-1 text-[11px] text-sky-700">Manager Walk</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center text-[11px] font-semibold text-emerald-700">Done</div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-center text-[11px] font-semibold text-amber-700">Assigned</div>
          </div>
          <div className="rounded-lg border border-csc-gold/30 bg-csc-gold/10 p-3">
            <p className="text-[11px] font-semibold text-csc-brown">Closing audit ready</p>
            <p className="mt-1 text-[10px] text-csc-brown/60">Photos, temps, names, and timestamps.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { employee } = useAuth()
  const [email, setEmail] = useState('')

  function startSignup(e) {
    e.preventDefault()
    const query = email.trim() ? `?mode=signup&email=${encodeURIComponent(email.trim())}` : '?mode=signup'
    navigate(`/login${query}`)
  }

  return (
    <main className="min-h-screen bg-white text-sky-950">
      <header className="sticky top-0 z-30 border-b border-sky-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-left">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-csc-red text-sm font-black text-white">OC</span>
            <span className="text-base font-extrabold tracking-tight text-sky-950">Operations Checklist</span>
          </button>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-sky-700 md:flex">
            <a href="#product" className="hover:text-csc-red">Product</a>
            <a href="#industries" className="hover:text-csc-red">Industries</a>
            <a href="#pricing" className="hover:text-csc-red">Pricing</a>
            <a href="#why-us" className="rounded-lg bg-csc-gold/15 px-3 py-2 text-csc-brown hover:bg-csc-gold/25">Why us</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(employee ? '/app' : '/login')} className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-sky-700 hover:text-csc-red sm:block">
              Sign in
            </button>
            <button onClick={() => navigate(employee ? '/app' : '/login?mode=signup')} className="rounded-lg bg-csc-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-csc-red-light">
              Get started
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-sky-100 bg-sky-50">
        <div className="landing-hero-visual">
          <ProductPreview />
        </div>
        <div className="relative mx-auto grid min-h-[640px] max-w-6xl items-center px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-csc-red">Built for shift-based teams</p>
            <h1 className="text-4xl font-black leading-tight tracking-normal text-sky-950 sm:text-5xl lg:text-6xl">
              Run every store checklist from one calm dashboard.
            </h1>
            <p className="mt-5 text-lg leading-8 text-sky-700">
              Assign opening, closing, cleaning, and temperature checks to the right people, then see exactly what was done, when, and by whom.
            </p>
            <form onSubmit={startSignup} className="mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your work email"
                className="min-h-12 flex-1 rounded-lg border border-sky-200 bg-white px-4 text-sm outline-none focus:border-csc-gold focus:ring-4 focus:ring-csc-gold/20"
              />
              <button type="submit" className="min-h-12 rounded-lg bg-csc-red px-6 text-sm font-extrabold text-white shadow-lg shadow-csc-red/20 hover:bg-csc-red-light">
                Create owner account
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-sky-600">
              <span>Owner setup</span>
              <span>Invite managers</span>
              <span>Keep audit history</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-sky-100 bg-white px-5 py-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Trusted by teams that live by the shift</p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm font-bold text-sky-200">
            {TRUSTED_TEAMS.map(team => <span key={team}>{team}</span>)}
          </div>
        </div>
      </section>

      <section id="product" className="bg-white px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
          {[
            ['Daily checklists', 'Opening, closing, cleaning, and food safety lists stay organized by role and shift.'],
            ['Assignments', 'Owners and managers can send the right work to the right teammate each day.'],
            ['Audit history', 'Every completion keeps names, times, and temperature values for later review.'],
            ['Multi-location ready', 'Organizations are separated now, with room to connect into Shiftway later.']
          ].map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-sky-100 bg-sky-50/60 p-5">
              <h2 className="text-base font-extrabold text-sky-950">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-sky-700">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="why-us" className="bg-csc-brown px-5 py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-csc-gold">Why operations teams use it</p>
            <h2 className="mt-4 text-3xl font-black tracking-normal">Less chasing. More proof.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['1', 'Create an organization as the owner.'],
              ['2', 'Invite managers, then employees.'],
              ['3', 'Track every checklist from the dashboard.']
            ].map(([num, copy]) => (
              <div key={num} className="rounded-lg border border-white/10 bg-white/[0.08] p-5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-csc-gold text-sm font-black text-csc-brown">{num}</span>
                <p className="mt-4 text-sm leading-6 text-white/80">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-sky-50 px-5 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-lg border border-sky-100 bg-white p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-csc-red">Start with one store</p>
            <h2 className="mt-2 text-2xl font-black text-sky-950">Set up the owner account, then invite the team.</h2>
          </div>
          <button onClick={() => navigate('/login?mode=signup')} className="rounded-lg bg-csc-red px-5 py-3 text-sm font-extrabold text-white hover:bg-csc-red-light">
            Get started free
          </button>
        </div>
      </section>
    </main>
  )
}
