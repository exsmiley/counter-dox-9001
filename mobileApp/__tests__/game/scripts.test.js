import { SCRIPTS, getScript, getScriptList, ScriptId } from '../../src/game/scripts';
import { getRoleById, RoleType } from '../../src/game/roles';

describe('Script Definitions', () => {
  test('all 3 scripts exist', () => {
    expect(getScript(ScriptId.TROUBLE_BREWING)).toBeTruthy();
    expect(getScript(ScriptId.SECTS_AND_VIOLETS)).toBeTruthy();
    expect(getScript(ScriptId.BAD_MOON_RISING)).toBeTruthy();
  });

  test('getScriptList returns all scripts', () => {
    const list = getScriptList();
    expect(list.length).toBe(3);
  });

  describe.each([
    [ScriptId.TROUBLE_BREWING, 'Trouble Brewing'],
    [ScriptId.SECTS_AND_VIOLETS, 'Sects & Violets'],
    [ScriptId.BAD_MOON_RISING, 'Bad Moon Rising'],
  ])('%s', (scriptId, expectedName) => {
    let script;

    beforeAll(() => {
      script = getScript(scriptId);
    });

    test('has correct name', () => {
      expect(script.name).toBe(expectedName);
    });

    test('has description and color', () => {
      expect(script.description).toBeTruthy();
      expect(script.color).toBeTruthy();
    });

    test('has role arrays', () => {
      expect(Array.isArray(script.townsfolk)).toBe(true);
      expect(Array.isArray(script.outsiders)).toBe(true);
      expect(Array.isArray(script.minions)).toBe(true);
      expect(Array.isArray(script.demons)).toBe(true);
    });

    test('has at least 13 townsfolk', () => {
      expect(script.townsfolk.length).toBeGreaterThanOrEqual(13);
    });

    test('has at least 4 outsiders', () => {
      expect(script.outsiders.length).toBeGreaterThanOrEqual(4);
    });

    test('has at least 4 minions', () => {
      expect(script.minions.length).toBeGreaterThanOrEqual(4);
    });

    test('has at least 1 demon', () => {
      expect(script.demons.length).toBeGreaterThanOrEqual(1);
    });

    test('all townsfolk role IDs are valid', () => {
      for (const roleId of script.townsfolk) {
        const role = getRoleById(roleId);
        expect(role).toBeTruthy();
        expect(role.type).toBe(RoleType.TOWNSFOLK);
      }
    });

    test('all outsider role IDs are valid', () => {
      for (const roleId of script.outsiders) {
        const role = getRoleById(roleId);
        expect(role).toBeTruthy();
        expect(role.type).toBe(RoleType.OUTSIDER);
      }
    });

    test('all minion role IDs are valid', () => {
      for (const roleId of script.minions) {
        const role = getRoleById(roleId);
        expect(role).toBeTruthy();
        expect(role.type).toBe(RoleType.MINION);
      }
    });

    test('all demon role IDs are valid', () => {
      for (const roleId of script.demons) {
        const role = getRoleById(roleId);
        expect(role).toBeTruthy();
        expect(role.type).toBe(RoleType.DEMON);
      }
    });

    test('has firstNightOrder array', () => {
      expect(Array.isArray(script.firstNightOrder)).toBe(true);
      expect(script.firstNightOrder.length).toBeGreaterThan(0);
    });

    test('has otherNightOrder array', () => {
      expect(Array.isArray(script.otherNightOrder)).toBe(true);
      expect(script.otherNightOrder.length).toBeGreaterThan(0);
    });

    test('all firstNightOrder entries are valid role IDs in this script', () => {
      for (const roleId of script.firstNightOrder) {
        expect(getRoleById(roleId)).toBeTruthy();
        expect(script.allRoles).toContain(roleId);
      }
    });

    test('all otherNightOrder entries are valid role IDs in this script', () => {
      for (const roleId of script.otherNightOrder) {
        expect(getRoleById(roleId)).toBeTruthy();
        expect(script.allRoles).toContain(roleId);
      }
    });

    test('allRoles contains all roles from each type', () => {
      const combined = [...script.townsfolk, ...script.outsiders, ...script.minions, ...script.demons];
      for (const roleId of combined) {
        expect(script.allRoles).toContain(roleId);
      }
    });

    test('no duplicate roles', () => {
      const uniqueRoles = new Set(script.allRoles);
      expect(uniqueRoles.size).toBe(script.allRoles.length);
    });
  });
});
