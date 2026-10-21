import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Subject } from 'rxjs'
import { Pose } from '../../../protocol'
import { SocketService } from '../../../socket.service'
import { MapPanel } from './map-panel'

describe('MapPanel', () => {
  const pose$ = new Subject<Pose>()
  const status = signal<'open' | 'closed'>('open')
  let panel: MapPanel

  const pose = (xMm: number, yMm = 0): Pose => ({ xMm, yMm, theta: 0, tMs: 0, questionable: false, relocated: false })

  beforeEach(() => {
    status.set('open')
    TestBed.configureTestingModule({ providers: [{ provide: SocketService, useValue: { status, pose$ } }] })
    panel = TestBed.runInInjectionContext(() => new MapPanel())
  })

  it('follows the robot: the latest pose and a growing trail', () => {
    pose$.next(pose(0))
    pose$.next(pose(50))
    expect(panel.pose()?.xMm).toBe(50)
    expect(panel.trail.path.length).toBe(2)
  })

  it('clears the trail on request', () => {
    pose$.next(pose(0))
    pose$.next(pose(50))
    panel.clearTrail()
    expect(panel.trail.path).toEqual([])
  })

  it('recentres the view', () => {
    panel.view.pan(30, 30)
    panel.recentre()
    expect(panel.view.centre).toEqual({ x: 0, y: 0 })
  })
})
