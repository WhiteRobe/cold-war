// 剧本下拉框：离线开局和在线建房共用
import { useEffect, useState } from 'preact/hooks';
import { BUILTIN_SCENARIOS, type Scenario } from '../../engine/scenario';
import { loadScenarios } from './Scenarios';

/** 当前选中的剧本；标准开局返回 undefined */
export function useScenarioPick() {
  const [scenarios, setScenarios] = useState<Scenario[]>(BUILTIN_SCENARIOS);
  const [id, setId] = useState('standard');
  useEffect(() => {
    loadScenarios().then(setScenarios);
  }, []);
  const sc = scenarios.find((x) => x.id === id);
  return { scenarios, id, setId, scenario: sc && sc.id !== 'standard' ? sc : undefined };
}

export function ScenarioPicker({ pick }: { pick: ReturnType<typeof useScenarioPick> }) {
  const { scenarios, id, setId, scenario } = pick;
  return (
    <div class="field">
      <label>剧本 <a href="#/scenarios" class="sc-manage">管理 / 编写剧本</a></label>
      <select class="input sc-select" value={id} onChange={(e) => setId((e.target as HTMLSelectElement).value)}>
        {scenarios.map((x) => <option key={x.id} value={x.id}>{x.year ? `${x.year} · ` : ''}{x.name}{x.builtin ? '' : `（${x.author || '玩家'}）`}</option>)}
      </select>
      {scenario && <p class="sc-pick-story">第 {scenario.startTurn}–{scenario.endTurn} 回合 · {scenario.story}</p>}
    </div>
  );
}
