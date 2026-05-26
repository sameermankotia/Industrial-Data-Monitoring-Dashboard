// In-process mock for the dashboard API. Wired into vite.config.ts behind
// VITE_DEMO=1 so it only loads in dev when explicitly enabled — production
// builds and the regular `npm run dev` never touch this file.
//
// Endpoints:
//   GET /api/v1/auth/token              -> { AccessToken, ExpiresIn, ... }
//   GET /api/v1/logic-engine/symbols    -> [{ Name, Type, Description }, ...]
//   GET /api/v1/logic-engine/symbols/:n -> { stVal, q, t, range, units, ... }

import type { Connect, Plugin } from 'vite';

interface SymbolDef {
  name: string;
  type: 'INS' | 'INT';
  description: string;
  units: string;
  base: number;
  amplitude: number;
  state: number;
  // Demo-only behavior overrides so the dashboard shows all three status pills
  // (Active / Stale / Inactive) at the same time:
  //   'down'  — always 404, simulates a sensor that has stopped reporting.
  //             The client never updates lastUpdated, so the row stays Inactive.
  //   'flaky' — responds for a 15-second window every 90 seconds. Combined
  //             with cycleOffsetMs staggered across symbols, at any wallclock
  //             moment one flaky symbol is Active, one Stale, and one Inactive.
  behavior?: 'down' | 'flaky';
  cycleOffsetMs?: number;
}

const SYMBOLS: SymbolDef[] = [
  { name: 'AnalogDeadband', type: 'INS', description: 'Analog input deadband threshold', units: 'mV', base: 42, amplitude: 6, state: 42 },
  { name: 'BinaryDebounce', type: 'INS', description: 'Binary input debounce delay', units: 'ms', base: 150, amplitude: 12, state: 150 },
  { name: 'CommTimeout', type: 'INS', description: 'Communication timeout', units: 'ms', base: 5000, amplitude: 200, state: 5000 },
  { name: 'SystemTimer', type: 'INS', description: 'System timer', units: 'ticks', base: 12_458, amplitude: 80, state: 12_458 },
  { name: 'BatteryVoltage', type: 'INS', description: 'Battery voltage', units: 'mV', base: 13_500, amplitude: 120, state: 13_500, behavior: 'flaky', cycleOffsetMs: 0 },
  { name: 'PrimaryCurrent', type: 'INS', description: 'Primary winding current', units: 'A', base: 850, amplitude: 35, state: 850 },
  { name: 'SecondaryCurrent', type: 'INS', description: 'Secondary winding current', units: 'A', base: 410, amplitude: 22, state: 410 },
  { name: 'PhaseAVoltage', type: 'INS', description: 'Phase A voltage', units: 'V', base: 13_800, amplitude: 60, state: 13_800 },
  { name: 'PhaseBVoltage', type: 'INS', description: 'Phase B voltage', units: 'V', base: 13_795, amplitude: 60, state: 13_795 },
  { name: 'PhaseCVoltage', type: 'INS', description: 'Phase C voltage', units: 'V', base: 13_810, amplitude: 60, state: 13_810 },
  { name: 'Frequency', type: 'INS', description: 'Line frequency', units: 'mHz', base: 60_000, amplitude: 30, state: 60_000 },
  { name: 'PowerFactor', type: 'INS', description: 'Power factor (×1000)', units: '', base: 950, amplitude: 15, state: 950 },
  { name: 'BreakerStatus', type: 'INS', description: 'Breaker position', units: '', base: 1, amplitude: 0, state: 1 },
  { name: 'FaultCount', type: 'INS', description: 'Cumulative fault count', units: '', base: 7, amplitude: 1, state: 7 },
  { name: 'TripCount', type: 'INS', description: 'Cumulative trip count', units: '', base: 3, amplitude: 1, state: 3 },
  { name: 'ReclosureCount', type: 'INS', description: 'Reclosure operations', units: '', base: 12, amplitude: 1, state: 12 },
  { name: 'OilTemperature', type: 'INS', description: 'Transformer oil temperature', units: '°C', base: 65, amplitude: 4, state: 65, behavior: 'flaky', cycleOffsetMs: 30_000 },
  { name: 'WindingTemperature', type: 'INS', description: 'Winding hot-spot temperature', units: '°C', base: 78, amplitude: 5, state: 78, behavior: 'flaky', cycleOffsetMs: 60_000 },
  { name: 'AmbientTemperature', type: 'INS', description: 'Cabinet ambient temperature', units: '°C', base: 24, amplitude: 35, state: 50 },
  { name: 'CoolingFanSpeed', type: 'INS', description: 'Cooling fan RPM', units: 'rpm', base: 1200, amplitude: 80, state: 1200 },
  { name: 'PressureSensor', type: 'INS', description: 'Hydraulic pressure', units: 'kPa', base: 3450, amplitude: 90, state: 3450 },
  { name: 'TankLevel', type: 'INS', description: 'Tank level (%)', units: '%', base: 78, amplitude: 4, state: 78 },
  { name: 'GroundCurrent', type: 'INS', description: 'Ground fault current', units: 'mA', base: 25, amplitude: 8, state: 25 },
  { name: 'NeutralVoltage', type: 'INS', description: 'Neutral voltage', units: 'V', base: 8, amplitude: 3, state: 8 },
  { name: 'PositiveSequenceVoltage', type: 'INS', description: 'Positive sequence voltage', units: 'V', base: 13_800, amplitude: 50, state: 13_800 },
  { name: 'NegativeSequenceVoltage', type: 'INS', description: 'Negative sequence voltage', units: 'V', base: 95, amplitude: 12, state: 95 },
  { name: 'ZeroSequenceVoltage', type: 'INS', description: 'Zero sequence voltage', units: 'V', base: 30, amplitude: 6, state: 30 },
  { name: 'HarmonicDistortion', type: 'INS', description: 'Total harmonic distortion (×100)', units: '%', base: 280, amplitude: 30, state: 280 },
  { name: 'RealPower', type: 'INS', description: 'Real power', units: 'kW', base: 4200, amplitude: 180, state: 4200 },
  { name: 'ReactivePower', type: 'INS', description: 'Reactive power', units: 'kVAR', base: 850, amplitude: 95, state: 850 },
  { name: 'ApparentPower', type: 'INS', description: 'Apparent power', units: 'kVA', base: 4290, amplitude: 180, state: 4290 },
  { name: 'EnergyExported', type: 'INS', description: 'Energy exported', units: 'kWh', base: 124_500, amplitude: 5, state: 124_500 },
  { name: 'EnergyImported', type: 'INS', description: 'Energy imported', units: 'kWh', base: 18_300, amplitude: 5, state: 18_300 },
  { name: 'CapacitorBank1', type: 'INS', description: 'Capacitor bank 1 status', units: '', base: 1, amplitude: 0, state: 1 },
  { name: 'CapacitorBank2', type: 'INS', description: 'Capacitor bank 2 status', units: '', base: 0, amplitude: 0, state: 0 },
  { name: 'TapPosition', type: 'INS', description: 'Tap-changer position', units: '', base: 9, amplitude: 1, state: 9 },
  { name: 'TripCircuitMonitor', type: 'INS', description: 'Trip circuit health', units: '', base: 1, amplitude: 0, state: 1 },
  { name: 'CloseCircuitMonitor', type: 'INS', description: 'Close circuit health', units: '', base: 1, amplitude: 0, state: 1 },
  { name: 'BatteryChargeRate', type: 'INS', description: 'Battery charge current', units: 'mA', base: 240, amplitude: 25, state: 240 },
  { name: 'EthernetLinkStatus', type: 'INS', description: 'Ethernet link state', units: '', base: 1, amplitude: 0, state: 1 },
  { name: 'PacketLossPpm', type: 'INS', description: 'Packet loss (parts per million)', units: 'ppm', base: 5, amplitude: 8, state: 5 },
  { name: 'CpuLoad', type: 'INS', description: 'Relay CPU utilization (%)', units: '%', base: 22, amplitude: 6, state: 22 },
  { name: 'MemoryUsed', type: 'INS', description: 'Memory used (%)', units: '%', base: 41, amplitude: 3, state: 41 },
  { name: 'EventLogDepth', type: 'INS', description: 'Event log entries', units: '', base: 482, amplitude: 4, state: 482, behavior: 'down' },
  { name: 'AlarmDepth', type: 'INS', description: 'Active alarm count', units: '', base: 2, amplitude: 1, state: 2, behavior: 'down' },
  { name: 'SettingsGroup', type: 'INS', description: 'Active settings group', units: '', base: 1, amplitude: 0, state: 1 },
  { name: 'GpsLockQuality', type: 'INS', description: 'GPS lock quality', units: '', base: 100, amplitude: 4, state: 100 },
  { name: 'IrigBStatus', type: 'INS', description: 'IRIG-B sync status', units: '', base: 1, amplitude: 0, state: 1 },
  // A couple of non-INS rows so the type filter has something to drop
  { name: 'SettingsRevision', type: 'INT', description: 'Settings revision number', units: '', base: 17, amplitude: 0, state: 17 },
  { name: 'FirmwareVersion', type: 'INT', description: 'Firmware version code', units: '', base: 41203, amplitude: 0, state: 41203 },
];

function step(sym: SymbolDef): number {
  if (sym.amplitude === 0) return sym.base;
  // Mean-reverting random walk so values stay near base but visibly move
  const drift = (Math.random() - 0.5) * sym.amplitude * 0.4;
  const pull = (sym.base - sym.state) * 0.15;
  sym.state = Math.round(sym.state + drift + pull);
  return sym.state;
}

function rangeFor(sym: SymbolDef, value: number): 'normal' | 'high' | 'low' {
  if (sym.amplitude === 0) return 'normal';
  const delta = value - sym.base;
  if (delta > sym.amplitude) return 'high';
  if (delta < -sym.amplitude) return 'low';
  return 'normal';
}

const FLAKY_CYCLE_MS = 90_000;
const FLAKY_RESPOND_WINDOW_MS = 15_000;

// Decide whether the mock should respond to a given symbol on this tick.
// `down` symbols never respond. `flaky` symbols respond for a 15s window
// every 90s, so over a full cycle the client sees Active → Stale → Inactive.
function shouldRespond(sym: SymbolDef, now: number): boolean {
  if (sym.behavior === 'down') return false;
  if (sym.behavior === 'flaky') {
    const offset = sym.cycleOffsetMs ?? 0;
    const phase = (now + offset) % FLAKY_CYCLE_MS;
    return phase < FLAKY_RESPOND_WINDOW_MS;
  }
  return true;
}

function send(res: Parameters<Connect.SimpleHandleFunction>[1], status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

const SYMBOL_BY_NAME = new Map(SYMBOLS.map((s) => [s.name, s]));

export function mockSelDevicePlugin(): Plugin {
  return {
    name: 'sel-mock-device',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/v1')) return next();

        if (url.startsWith('/api/v1/auth/token')) {
          // Tiny delay so the loading spinner is briefly visible
          setTimeout(() => {
            send(res, 200, {
              AccessToken: 'demo-' + Math.random().toString(36).slice(2),
              ExpiresIn: 3600,
              Scope: 'api',
              TokenType: 'Bearer',
            });
          }, 250);
          return;
        }

        if (url.startsWith('/api/v1/logic-engine/symbols?') || url === '/api/v1/logic-engine/symbols') {
          return send(
            res,
            200,
            SYMBOLS.map((s) => ({ Name: s.name, Type: s.type, Description: s.description })),
          );
        }

        const m = url.match(/^\/api\/v1\/logic-engine\/symbols\/([^?]+)/);
        if (m) {
          const name = decodeURIComponent(m[1] as string);
          const sym = SYMBOL_BY_NAME.get(name);
          if (!sym) return send(res, 404, { title: 'Not Found', status: 404, detail: `${name} not known` });

          if (!shouldRespond(sym, Date.now())) {
            const status = sym.behavior === 'down' ? 404 : 503;
            const title = status === 404 ? 'Not Found' : 'Service Unavailable';
            return send(res, status, { title, status, detail: `${name} not reporting` });
          }

          const value = step(sym);
          return send(res, 200, {
            stVal: value,
            q: {
              validity: 'good',
              source: 'process',
              test: false,
              operatorBlocked: false,
              detailQual: {
                overflow: false,
                outOfRange: false,
                badReference: false,
                oscillatory: false,
                failure: false,
                oldData: false,
                inconsistent: false,
                inaccurate: false,
              },
            },
            t: {
              value: new Date().toISOString(),
              leapSecondsKnown: true,
              clockFailure: false,
              clockNotSynchronized: false,
              timeAccuracy: 10,
              source: 'ntp',
            },
            range: rangeFor(sym, value),
            units: sym.units,
            multiplier: 1,
            d: sym.description,
          });
        }

        return next();
      });
    },
  };
}
