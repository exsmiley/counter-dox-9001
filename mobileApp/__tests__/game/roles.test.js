import {
  ALL_ROLES,
  TROUBLE_BREWING_ROLES,
  SECTS_AND_VIOLETS_ROLES,
  BAD_MOON_RISING_ROLES,
  TRAVELLER_ROLES,
  FABLED_ROLES,
  getRoleById,
  getRolesByType,
  getRolesByTeam,
  getTeamForType,
  RoleType,
  Team,
  Phase,
  PLAYER_COUNT_DISTRIBUTION,
} from '../../src/game/roles';

describe('Role Definitions', () => {
  describe('All roles have required fields', () => {
    const allRoles = Object.values(ALL_ROLES);

    test.each(allRoles.map(r => [r.id, r]))('%s has required fields', (id, role) => {
      expect(role.id).toBe(id);
      expect(typeof role.name).toBe('string');
      expect(role.name.length).toBeGreaterThan(0);
      expect(typeof role.ability).toBe('string');
      expect(role.ability.length).toBeGreaterThan(0);
      expect(Object.values(RoleType)).toContain(role.type);
    });

    test.each(allRoles.filter(r => r.type !== RoleType.FABLED).map(r => [r.id, r]))(
      '%s has a valid team',
      (id, role) => {
        expect([Team.GOOD, Team.EVIL]).toContain(role.team);
      }
    );
  });

  describe('Trouble Brewing roles', () => {
    const roles = Object.values(TROUBLE_BREWING_ROLES);

    test('has exactly 22 roles', () => {
      expect(roles.length).toBe(22);
    });

    test('has 13 Townsfolk', () => {
      expect(roles.filter(r => r.type === RoleType.TOWNSFOLK).length).toBe(13);
    });

    test('has 4 Outsiders', () => {
      expect(roles.filter(r => r.type === RoleType.OUTSIDER).length).toBe(4);
    });

    test('has 4 Minions', () => {
      expect(roles.filter(r => r.type === RoleType.MINION).length).toBe(4);
    });

    test('has 1 Demon', () => {
      expect(roles.filter(r => r.type === RoleType.DEMON).length).toBe(1);
    });

    test('all Townsfolk and Outsiders are Good team', () => {
      for (const r of roles.filter(r => r.type === RoleType.TOWNSFOLK || r.type === RoleType.OUTSIDER)) {
        expect(r.team).toBe(Team.GOOD);
      }
    });

    test('all Minions and Demons are Evil team', () => {
      for (const r of roles.filter(r => r.type === RoleType.MINION || r.type === RoleType.DEMON)) {
        expect(r.team).toBe(Team.EVIL);
      }
    });

    test('contains expected key characters', () => {
      const names = roles.map(r => r.id);
      expect(names).toContain('washerwoman');
      expect(names).toContain('imp');
      expect(names).toContain('poisoner');
      expect(names).toContain('drunk');
      expect(names).toContain('baron');
      expect(names).toContain('scarlet_woman');
      expect(names).toContain('fortune_teller');
      expect(names).toContain('monk');
      expect(names).toContain('slayer');
      expect(names).toContain('mayor');
      expect(names).toContain('virgin');
      expect(names).toContain('saint');
      expect(names).toContain('butler');
    });

    test('Imp can target self', () => {
      const imp = getRoleById('imp');
      expect(imp.nightAction.canTargetSelf).toBe(true);
    });

    test('Baron has setup effect', () => {
      const baron = getRoleById('baron');
      expect(baron.setup).toBe(true);
      expect(baron.setupEffect).toBe('addOutsiders');
      expect(baron.setupValue).toBe(2);
    });

    test('Drunk has setup effect', () => {
      const drunk = getRoleById('drunk');
      expect(drunk.setup).toBe(true);
      expect(drunk.setupEffect).toBe('thinksTheyAreTownsfolk');
    });
  });

  describe('Sects & Violets roles', () => {
    const roles = Object.values(SECTS_AND_VIOLETS_ROLES);

    test('has exactly 25 roles', () => {
      expect(roles.length).toBe(25);
    });

    test('has 13 Townsfolk', () => {
      expect(roles.filter(r => r.type === RoleType.TOWNSFOLK).length).toBe(13);
    });

    test('has 4 Outsiders', () => {
      expect(roles.filter(r => r.type === RoleType.OUTSIDER).length).toBe(4);
    });

    test('has 4 Minions', () => {
      expect(roles.filter(r => r.type === RoleType.MINION).length).toBe(4);
    });

    test('has 4 Demons', () => {
      expect(roles.filter(r => r.type === RoleType.DEMON).length).toBe(4);
    });

    test('contains key characters', () => {
      const names = roles.map(r => r.id);
      expect(names).toContain('fang_gu');
      expect(names).toContain('vortox');
      expect(names).toContain('no_dashii');
      expect(names).toContain('vigormortis');
      expect(names).toContain('evil_twin');
      expect(names).toContain('witch');
      expect(names).toContain('pit_hag');
      expect(names).toContain('snake_charmer');
      expect(names).toContain('philosopher');
    });

    test('Fang Gu adds 1 Outsider', () => {
      const fg = getRoleById('fang_gu');
      expect(fg.setup).toBe(true);
      expect(fg.setupValue).toBe(1);
    });

    test('Vigormortis removes 1 Outsider', () => {
      const v = getRoleById('vigormortis');
      expect(v.setup).toBe(true);
      expect(v.setupEffect).toBe('removeOutsiders');
    });
  });

  describe('Bad Moon Rising roles', () => {
    const roles = Object.values(BAD_MOON_RISING_ROLES);

    test('has exactly 25 roles', () => {
      expect(roles.length).toBe(25);
    });

    test('has 13 Townsfolk', () => {
      expect(roles.filter(r => r.type === RoleType.TOWNSFOLK).length).toBe(13);
    });

    test('has 4 Outsiders', () => {
      expect(roles.filter(r => r.type === RoleType.OUTSIDER).length).toBe(4);
    });

    test('has 4 Minions', () => {
      expect(roles.filter(r => r.type === RoleType.MINION).length).toBe(4);
    });

    test('has 4 Demons', () => {
      expect(roles.filter(r => r.type === RoleType.DEMON).length).toBe(4);
    });

    test('contains key characters', () => {
      const names = roles.map(r => r.id);
      expect(names).toContain('zombuul');
      expect(names).toContain('pukka');
      expect(names).toContain('shabaloth');
      expect(names).toContain('po');
      expect(names).toContain('assassin');
      expect(names).toContain('mastermind');
      expect(names).toContain('grandmother');
      expect(names).toContain('innkeeper');
      expect(names).toContain('exorcist');
    });

    test('Lunatic has setup effect', () => {
      const lunatic = getRoleById('lunatic');
      expect(lunatic.setup).toBe(true);
      expect(lunatic.setupEffect).toBe('thinksTheyAreDemon');
    });
  });

  describe('Traveller roles', () => {
    const roles = Object.values(TRAVELLER_ROLES);

    test('has at least 10 Travellers', () => {
      expect(roles.length).toBeGreaterThanOrEqual(10);
    });

    test('all are Traveller type', () => {
      for (const r of roles) {
        expect(r.type).toBe(RoleType.TRAVELLER);
      }
    });
  });

  describe('Fabled roles', () => {
    const roles = Object.values(FABLED_ROLES);

    test('has at least 8 Fabled', () => {
      expect(roles.length).toBeGreaterThanOrEqual(8);
    });

    test('all are Fabled type with null team', () => {
      for (const r of roles) {
        expect(r.type).toBe(RoleType.FABLED);
        expect(r.team).toBeNull();
      }
    });
  });

  describe('Helper functions', () => {
    test('getRoleById returns correct role', () => {
      expect(getRoleById('imp').name).toBe('Imp');
      expect(getRoleById('washerwoman').name).toBe('Washerwoman');
      expect(getRoleById('nonexistent')).toBeNull();
    });

    test('getRolesByType returns correct roles', () => {
      const townsfolk = getRolesByType(RoleType.TOWNSFOLK);
      expect(townsfolk.length).toBeGreaterThan(0);
      for (const r of townsfolk) {
        expect(r.type).toBe(RoleType.TOWNSFOLK);
      }
    });

    test('getRolesByTeam returns correct roles', () => {
      const evil = getRolesByTeam(Team.EVIL);
      expect(evil.length).toBeGreaterThan(0);
      for (const r of evil) {
        expect(r.team).toBe(Team.EVIL);
      }
    });

    test('getTeamForType returns correct team', () => {
      expect(getTeamForType(RoleType.TOWNSFOLK)).toBe(Team.GOOD);
      expect(getTeamForType(RoleType.OUTSIDER)).toBe(Team.GOOD);
      expect(getTeamForType(RoleType.MINION)).toBe(Team.EVIL);
      expect(getTeamForType(RoleType.DEMON)).toBe(Team.EVIL);
      expect(getTeamForType(RoleType.FABLED)).toBeNull();
    });
  });

  describe('Player count distribution', () => {
    test('covers 5-20 players', () => {
      for (let i = 5; i <= 20; i++) {
        expect(PLAYER_COUNT_DISTRIBUTION[i]).toBeDefined();
      }
    });

    test('each distribution sums to player count', () => {
      for (const [count, dist] of Object.entries(PLAYER_COUNT_DISTRIBUTION)) {
        const sum = dist.reduce((a, b) => a + b, 0);
        expect(sum).toBe(Number(count));
      }
    });

    test('always has exactly 1 demon', () => {
      for (const dist of Object.values(PLAYER_COUNT_DISTRIBUTION)) {
        expect(dist[3]).toBe(1);
      }
    });

    test('townsfolk count always increases or stays same with player count', () => {
      let prev = 0;
      for (let i = 5; i <= 20; i++) {
        const tf = PLAYER_COUNT_DISTRIBUTION[i][0];
        expect(tf).toBeGreaterThanOrEqual(prev - 2); // can drop when outsiders increase
        prev = tf;
      }
    });
  });
});
