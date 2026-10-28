import type { CustomKind } from '../../content/enemies';
import type { Enemy } from '../Enemy';
import { archer } from './archer';
import { beetle } from './beetle';
import { blob } from './blob';
import { devil } from './devil';
import { gargoyle } from './gargoyle';
import { gator } from './gator';
import { hound, houndmaster } from './hounds';
import { imp } from './imp';
import { jester } from './jester';
import { necromancer } from './necromancer';
import { priest } from './priest';
import { rat } from './rat';
import { shark } from './shark';
import { shroom } from './shroom';
import { spitter } from './spitter';
import { toad } from './toad';
import { turret } from './turret';
import { twin } from './twin';
import type { Behaviour, BehaviourFactory, EnemyWorld } from './types';
import { wisp } from './wisp';

const factories: Record<CustomKind, BehaviourFactory> = { beetle, archer, wisp, rat, necromancer, shark, imp, turret, devil, priest, jester, gargoyle, twin, houndmaster, hound, blob, spitter, toad, gator, shroom };

export const createBehaviour = (kind: CustomKind, host: Enemy, world: EnemyWorld): Behaviour => factories[kind](host, world);
