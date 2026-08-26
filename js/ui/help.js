'use strict';

/* Help / Ajuda — documentação prática do que REALMENTE existe.
   Sem arquitetura, sem detalhes de código, só uso do produto. */

Object.assign(Screens, {
  help() {
    this.el('#screen').innerHTML = `
      <div class="panel">
        <div class="panel-title">❓ AJUDA — EVOQUEST</div>
        <p class="hero-sub" style="line-height:1.5">
          EvoQuest é um Todo List gamificado com estética RPG retrô.
          Você cria <b style="color:var(--text)">atributos</b> que representam sua vida
          (Estudos, Exercícios, Projetos...) e <b style="color:var(--text)">missões</b> vinculadas a eles.
          Ao concluir missões você ganha <b style="color:var(--text)">XP</b> no atributo e no personagem,
          sobe de nível e desbloqueia conquistas. Tudo fica salvo no seu navegador.
        </p>
      </div>

      <div class="panel">
        <div class="panel-title">🗺️ NAVEGAÇÃO</div>
        <div class="help-section">
          <p><b>🏠 Início</b> — resumo do personagem, XP geral, atributos com barra de nível, missões ativas e contadores (concluídas / conquistas / Gold).</p>
          <p><b>⚔️ Missões</b> — todas as missões com filtros: Todas, Pendentes, Concluídas e Histórico. Crie, edite, exclua e conclua por aqui.</p>
          <p><b>📜 Regras</b> — compromissos recorrentes com streak. Veja streak, quebras e Gold perdido. Cumprir é opcional; quebrar zera o streak e desconta Gold.</p>
          <p><b>📊 Atributos</b> — seus atributos (categorias) com nível e barra de XP. Crie, edite ou exclua (excluir nunca apaga missões).</p>
          <p><b>🏆 Conquistas</b> — 32 conquistas. As desbloqueadas ficam no topo; as bloqueadas aparecem com 🔒.</p>
          <p><b>👤 Personagem</b> — avatar, nível, estatísticas, equipamento, loja, inventário e reiniciar aventura.</p>
          <p><b>❓ Ajuda</b> — esta tela.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">⭐ ATRIBUTOS (CATEGORIAS)</div>
        <div class="help-section">
          <p>Nenhum atributo vem pronto — você cria os seus (ex.: Estudos, Leitura, Exercícios).</p>
          <p><b>Criar:</b> Atributos → <b>+ NOVA CATEGORIA</b> ou Início → <b>+ CRIAR CATEGORIA</b>. Escolha ícone (toque para abrir seletor, busque por nome), nome e descrição opcional.</p>
          <p><b>Editar:</b> ícone ✎ no cartão. Renomear ou trocar ícone não afeta XP nem missões.</p>
          <p><b>Excluir:</b> 🗑 pergunta o que fazer com as missões vinculadas:</p>
          <ul class="help-list">
            <li><b>Manter sem categoria</b> — missões ficam com “— Sem categoria —”.</li>
            <li><b>Reatribuir</b> — escolhe outra categoria existente.</li>
          </ul>
          <p>O XP já ganho no atributo é mantido mesmo após excluir.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">⚔️ MISSÕES</div>
        <div class="help-section">
          <p><b>Criar:</b> <b>+ NOVA MISSÃO</b> (Início ou Missões). Preencha título, descrição opcional, categoria, dificuldade e frequência.</p>
          <p><b>Dificuldade → XP/Gold:</b></p>
          <ul class="help-list">
            <li>Fácil — 10 XP / 5 🪙</li>
            <li>Normal — 25 XP / 10 🪙</li>
            <li>Difícil — 50 XP / 20 🪙</li>
            <li>Épica — 100 XP / 40 🪙</li>
            <li>Personalizada — XP livre / 10 🪙 fixo</li>
          </ul>
          <p>Trocar a dificuldade preenche o XP automaticamente; você pode editar o valor depois.</p>
          <p><b>Frequência:</b></p>
          <ul class="help-list">
            <li><b>Uma vez</b> — conclui uma única vez.</li>
            <li><b>Diária</b> — uma vez por dia. Mostra “✓ COMPLETA HOJE · volta amanhã”.</li>
            <li><b>Semanal</b> — uma vez por semana (segunda a domingo).</li>
            <li><b>Mensal</b> — uma vez por mês.</li>
          </ul>
          <p>A disponibilidade é calculada pelo histórico. Recarregar a página não libera reconclusão no mesmo período. Se o app ficar aberto na virada do dia, as diárias voltam sozinhas.</p>
          <p><b>Concluir:</b> □ ou botão <b>✓ CONCLUIR</b>. Gera animação, +XP, +Gold e verifica level up e conquistas.</p>
          <p><b>Desfazer:</b> em Histórico ou no cartão da missão → <b>↺ DESFAZER</b>. Remove a última conclusão, devolve XP e Gold da missão (bônus de level up/conquista não são revertidos).</p>
          <p><b>Editar / Excluir:</b> botões no cartão. Excluir mantém o histórico e o XP já ganho.</p>
          <p><b>Dica:</b> dentro de “Nova missão”, o botão <b>+</b> ao lado da categoria abre o criador de categoria sem perder o que você já digitou.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">📜 REGRINHAS</div>
        <div class="help-section">
          <p>Diferente de missões: regrinhas não dão XP/Gold. Servem para manter um comportamento.</p>
          <p><b>Criar:</b> Regras → <b>+ NOVA REGRINHA</b>. Define nome, descrição, categoria, frequência (diária/semanal/mensal), penalidade em Gold e horário limite opcional (só para diárias).</p>
          <p><b>Cumprir:</b> botão <b>✓ CUMPRIR</b> ou 🔥. Só uma vez por período; duplicado avisa “Já registrada neste período”.</p>
          <p><b>Streak:</b> períodos consecutivos cumpridos. Quebrar zera para 0.</p>
          <p><b>Quebra:</b> quando um período termina sem cumprimento. A verificação é automática ao abrir o app ou a aba Regras. Cada quebra desconta a penalidade do Gold uma única vez.</p>
          <p>Exemplo: regrinha diária com penalidade 10, sem cumprir hoje → amanhã aparece <b>❌ REGRA QUEBRADA · streak 0 · -10 🪙</b>.</p>
          <p><b>Editar / Excluir</b> pelos botões do cartão. Excluir remove o histórico de streak; Gold não é devolvido.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">📈 NÍVEIS E XP</div>
        <div class="help-section">
          <p>Todo XP ganho na missão soma no atributo e no personagem.</p>
          <p><b>Fórmula:</b> XP para subir de nível = <b>100 + (nível atual × 50)</b>. Ex.: nível 1→2 precisa 150, 2→3 precisa 200.</p>
          <p>A barra mostra só o progresso dentro do nível atual; o XP total nunca é apagado.</p>
          <p><b>Bônus em Gold:</b> +25 ao subir nível de atributo, +50 ao subir nível geral, +15 por conquista.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">🪙 GOLD, LOJA E INVENTÁRIO</div>
        <div class="help-section">
          <p>Gold vem de missões e bônus. É gasto só em cosméticos.</p>
          <p><b>Loja (👤 → 🛒 LOJA):</b> abas Avatares, Cabeça, Corpo, Acessórios, Fundos. Raridades: Comum, Incomum, Raro, Épico, Lendário. Alguns itens são 🔒 BLOQUEADO e desbloqueiam por conquista (ex.: Troféu de Ouro com 100 missões).</p>
          <p><b>Comprar:</b> precisa ter Gold suficiente; não duplica compra; Gold nunca fica negativo.</p>
          <p><b>Equipar:</b> botão EQUIPAR; equipado mostra ✓ EQUIPADO. Desequipar pelo mesmo botão ou no Inventário.</p>
          <p><b>Inventário (🎒):</b> lista só o que você já comprou, com EQUIPAR/✓.</p>
          <p><b>Avatar do perfil:</b> se equipou um avatar da loja, ele aparece; senão, o avatar básico escolhido na edição do personagem.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">👤 PERSONAGEM</div>
        <div class="help-section">
          <p>Criação no primeiro acesso: nome e classe (sugestões: Guerreiro, Mago, Arqueiro... ou ✨ Personalizado com texto livre).</p>
          <p><b>Editar:</b> 👤 → <b>✎ EDITAR PERSONAGEM</b> (nome, classe, avatar básico). Nunca altera XP/nível.</p>
          <p><b>Compartilhar:</b> <b>📸 COMPARTILHAR PROGRESSO</b> gera uma imagem da ficha.</p>
          <p><b>Reiniciar aventura:</b> apaga TODO o save deste navegador permanentemente. Pede confirmação.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">💾 ARMAZENAMENTO E AUTOSAVE</div>
        <div class="help-section">
          <p>Tudo fica em <b>localStorage</b> no seu navegador. Não há backend, conta ou nuvem.</p>
          <p><b>Autosave:</b> cada ação salva na hora (criar/editar/excluir, concluir/desfazer, cumprir regrinha, comprar/equipar). Não precisa salvar manualmente.</p>
          <p><b>Fechar e reabrir</b> mantém o progresso.</p>
          <p><b>Limpar dados de navegação</b> ou usar outro navegador/dispositivo → progresso perdido (sem sincronização).</p>
          <p>Atualizações do app migram saves antigos automaticamente sem perder progresso.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">✨ COMPORTAMENTOS ÚTEIS</div>
        <div class="help-section">
          <ul class="help-list">
            <li><b>ESC</b> fecha seletor de ícones; se não estiver aberto, fecha o modal.</li>
            <li><b>Seletor de ícones:</b> toque no ícone → favoritos; digite para buscar (ex.: “livro”, “tecnologia”); <b>MAIS</b> mostra catálogo completo por grupos.</li>
            <li><b>Histórico:</b> Missões → <b>HISTÓRICO</b> mostra até 100 conclusões com data/hora.</li>
            <li><b>Animações</b> respeitam “reduzir movimento” do sistema.</li>
            <li><b>Instalação:</b> no celular, use “Adicionar à tela inicial” / “Instalar app” do navegador. Funciona offline depois da primeira carga.</li>
          </ul>
        </div>
      </div>

      <div class="panel" style="text-align:center">
        <p class="hero-sub">Dúvidas? Explore as abas — todo progresso é local e reversível (desfazer) quando possível.</p>
        <button class="btn btn-primary" data-action="nav" data-screen="home" style="margin-top:10px">VOLTAR AO INÍCIO</button>
      </div>
    `;

    // Styles injected once
    if (!document.getElementById('help-style')) {
      const s = document.createElement('style');
      s.id = 'help-style';
      s.textContent = `
        .help-section p { margin: 8px 0; font-size: 18px; line-height: 1.45; color: var(--text); }
        .help-section b { color: var(--text); }
        .help-list { margin: 6px 0 8px 18px; color: var(--text); font-size: 18px; line-height: 1.45; }
        .help-list li { margin: 4px 0; }
        .help-list li::marker { color: var(--dim); }
      `;
      document.head.appendChild(s);
    }
  }
});
