# EvoQuest

> Transforme sua vida em uma aventura.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![localStorage](https://img.shields.io/badge/storage-localStorage-4A4A68)

**EvoQuest** é um Todo List gamificado com estética de RPG retrô. Tarefas e metas da vida real viram **missões**: ao completá-las, você ganha XP nos atributos que você mesmo cria e evolui seu personagem.

Tudo roda no navegador, sem framework, sem backend e sem banco de dados — a persistência é feita inteiramente com `localStorage`.

---

## 📖 Sobre o projeto

EvoQuest nasceu como um projeto pessoal para explorar três coisas: **gamificação**, **interfaces retrô** e **desenvolvimento frontend com JavaScript puro**.

A premissa é simples: listas de tarefas comuns não dão nenhuma sensação de progresso. Em um RPG, cada ação gera XP, cada XP enche uma barra e cada barra cheia vira um level up. O EvoQuest aplica essa lógica à vida real, transformando o esforço cotidiano em progressão visível.

É também um exercício de contenção: nada de frameworks, bibliotecas de animação ou abstrações desnecessárias — apenas HTML, CSS, Vanilla JS e as APIs nativas do navegador.

---

## 🎮 Demonstração

![Inicio](img/inicio.png)

![Conquistas](img/conquistas.png)


## ✨ Funcionalidades

- [x] Criação de personagem (nome e classe sugerida ou totalmente personalizada);
- [x] **Zero categorias pré-definidas** — o jogador cria os atributos que representam a própria vida;
- [x] Categorias com nome, ícone, descrição, criação/edição/exclusão;
- [x] Exclusão de categoria nunca apaga missões: manter sem categoria ou reatribuir;
- [x] Missões com título, descrição, categoria, dificuldade e frequência;
- [x] Dificuldades Fácil / Normal / Difícil / Épica preenchem o XP automaticamente (10/25/50/100), com XP personalizável;
- [x] Perfil do personagem com avatar, estatísticas derivadas e edição (nome/classe/avatar);
- [x] Avatares básicos escolhíveis + avatares cosméticos na loja;
- [x] **Gold**: moeda ganha por missão (5–40, conforme dificuldade) com bônus de level up e conquista;
- [x] 🛒 Loja exclusivamente cosmética: avatares, cabeça, corpo, acessórios e fundos;
- [x] Itens data-driven com raridade visual (comum → lendário) e itens desbloqueados por conquista;
- [x] Inventário com equipar/desequipar; economia à prova de duplicação;
- [x] Missões únicas, diárias, semanais ou mensais — sem duplicar registros no save;
- [x] Histórico de conclusões separado da definição das missões;
- [x] Sistema de XP por atributo e nível geral do personagem;
- [x] Level Up de atributos e geral, com animações;
- [x] 32 conquistas desbloqueáveis automaticamente (sistema data-driven);
- [x] Estatísticas derivadas de uma única fonte de verdade;
- [x] Persistência versionada em `localStorage` com migração automática;
- [x] Interface responsiva mobile-first (320px+);
- [x] Feedback visual: toasts, barras animadas, overlays em fila, microinterações;
- [x] Suporte a `prefers-reduced-motion`.

---

## 🔄 Como funciona

```text
Criar categorias → Criar missão → Escolher dificuldade/frequência
      ↓
Completar missão → ✓ Feedback → +XP → Barra anima
      ↓
Level Up? → ✨ LEVEL UP!
      ↓
Nova conquista? → 🏆 DESBLOQUEADA
```

### Dificuldade

| Dificuldade | XP padrão |
|---|---|
| Fácil | 10 |
| Normal | 25 |
| Difícil | 50 |
| Épica | 100 |

Selecionar uma dificuldade preenche o XP automaticamente; alterar o valor manualmente tem prioridade. Há também a opção **Personalizada**, só com o campo de XP livre.

### Frequência

Uma missão é uma **definição**, nunca duplicada no save. O sistema consulta o histórico de conclusões para decidir se ela está disponível:

| Frequência | Regra |
|---|---|
| Uma vez | Concluída apenas uma vez |
| Diária | Uma vez por dia — "✓ COMPLETA HOJE · volta amanhã" |
| Semanal | Uma vez por semana |
| Mensal | Uma vez por mês |

Cada conclusão gera uma entrada no histórico (`completions`), preservando quando foi feita, quanto valeu e permitindo futuras estatísticas.

### Categorias

Nenhum atributo vem pronto: você cria os seus (Estudos, Leitura, Exercícios, Projetos...). Renomear ou trocar o ícone não afeta XP nem missões. Ao excluir uma categoria com missões vinculadas, o app pergunta o que fazer:

```text
O que deseja fazer com as missões?

( ) Manter missões sem categoria
( ) Reatribuir para outra categoria
( ) Cancelar
```

### Nível geral

Todo XP ganho em qualquer categoria também soma no personagem. A fórmula é previsível:

```text
XP necessário para subir de nível = 100 + (nível atual × 50)
```

O XP histórico nunca é apagado; a barra mostra apenas o progresso dentro do nível atual.

---

## 🪙 Gold e Loja

Completar missões rende **Gold**, conforme a dificuldade:

| Dificuldade | Gold |
|---|---|
| Fácil | 5 |
| Normal | 10 |
| Difícil | 20 |
| Épica | 40 |

Bônus: level up de categoria (+25), level up geral (+50) e conquista desbloqueada (+15). Nada é duplicado: a conclusão é registrada no histórico antes das recompensas, então recarregar a página ou reconcluir uma missão nunca gera Gold extra.

A **🛒 Loja** é exclusivamente cosmética — avatares, cabeça, corpo, acessórios e fundos. Itens são definidos por dados (`SHOP_ITEMS` em `js/game/shop.js`) com raridade visual:

```text
Comum 50 · Incomum 100 · Raro 250 · Épico 500 · Lendário 1000
```

Alguns itens não se compram: são desbloqueados por conquistas e aparecem como 🔒 BLOQUEADO até que o requisito seja cumprido. O inventário permite equipar e desequipar; nada disso afeta XP ou gameplay.

---

## 🏆 Conquistas

32 conquistas desbloqueadas automaticamente, todas declarativas (`ACHIEVEMENT_DEFS` em `js/game/achievements.js`) — adicionar uma nova é acrescentar uma entrada com uma condição:

- **Missões**: Primeiro Passo (1) · Aventureiro (10) · Veterano (50) · Herói (100) · Lenda (1.000) · Mito (5.000)
- **XP**: Primeira Recompensa (1) · Colecionador de XP (1.000) · Tesouro (5.000) · Fortuna (10.000) · Montanha de XP (50.000)
- **Níveis**: Evolução (nv.2) · Veterano de Atributo (nv.5) · Mestre (nv.10) · Grande Mestre (nv.20)
- **Diversidade**: Primeiro Atributo · Especialista (nv.10) · Generalista (3 categorias) · Polímata (5 categorias) · Mestre em Tudo (nv.5 em 5 categorias)
- **Recorrência**: Rotina (diárias em 7 dias distintos) · Constância (semanais em 4 semanas) · Ciclo Completo (mensais em 3 meses)
- **Exploração**: Primeira Jornada · Arsenal de Missões (10) · Planejador (25) · Estrategista (50)
- **Especiais**: Primeiro Level Up · Multiclasse (progresso em 3 atributos) · Colecionador (10 conquistas) · Caçador de Conquistas (25) · Lenda Viva (todas)

---

## 🛠️ Tecnologias

| Tecnologia | Papel |
|---|---|
| **HTML5** | Estrutura das telas e navegação |
| **CSS3** | Estética RPG retrô, responsividade mobile-first e animações |
| **JavaScript (Vanilla)** | Lógica do jogo, estado central e manipulação do DOM |
| **localStorage** | Persistência dos dados no navegador |

Zero dependências de código. As fontes pixeladas (Press Start 2P e VT323) são carregadas via Google Fonts, com fallback monoespaçado.

---

## 🏗️ Arquitetura

Lógica de negócio ≠ persistência ≠ interface:

```text
Interface (ui/*, app.js)
   ↓
Game Logic (game/*, state.js)
   ↓
Estado central (single source of truth)
   ↓
Local Storage (storage.js)
```

```text
evoquest/
├── index.html              # shell + ordem de carregamento
├── css/
│   └── style.css           # tema retrô, responsividade, animações
├── js/
│   ├── storage.js          # persistência versionada + migrações
│   ├── state.js            # estado central, estatísticas derivadas, completeQuest
│   ├── game/
│   │   ├── xp.js           # fórmulas de XP/nível (funções puras)
│   │   ├── categories.js   # CRUD de categorias (exclusão nunca apaga missões)
│   │   ├── quests.js       # dificuldades, recorrência, disponibilidade
│   │   ├── achievements.js # conquistas data-driven
│   │   └── shop.js         # itens cosméticos, raridades, compra/equip
│   └── ui/
│       ├── screens.js      # renderização das telas
│       ├── modals.js       # modais (missão, categoria, exclusão segura)
│       └── notifications.js# toasts, overlays, animação das barras
├── test-core.js            # testes headless da lógica
└── test-ui.js              # smoke test de interface (requer jsdom)
```

O estado é um único objeto serializável — contadores deriváveis não são armazenados:

```javascript
{
    version: 4,
    player: { name, class, customClass, avatarId, createdCategory, level, totalXp },
    categories: [{ id, icon, name, description, xp, createdAt }],
    quests: [{ id, title, description, categoryId, difficulty, xp, recurrence, createdAt }],
    completions: [{ id, questId, recurrence, xp, at }],  // fonte da verdade do histórico
    achievements: [{ id, unlockedAt }],
    wallet: { gold },
    inventory: { owned: [], equipped: { avatar, head, body, accessory, background } }
}
```

Saves antigos (v1/v2/v3) são **migrados automaticamente** ao carregar (`Storage.migrate`): missões ganham os novos campos, o histórico é reconstruído e nenhum progresso é perdido.

Para rodar os testes da lógica:

```bash
node test-core.js
```

Smoke test de interface (fluxo completo simulado em DOM real):

```bash
npm install --no-save jsdom
node test-ui.js
```

---

## 💾 Persistência

- Sem backend e sem conta de usuário;
- Todos os dados ficam no `localStorage` do seu navegador;
- Fechar e reabrir mantém todo o progresso;
- Limpar os dados de navegação **apaga** o progresso;
- Não há sincronização entre dispositivos;
- Na tela do personagem existe **"Reiniciar aventura"**, que apaga o save permanentemente.

---

## 🚀 Como executar

Sem build e sem dependências obrigatórias.

**Opção 1 — abrir direto**

```bash
git clone <url-do-repositorio>
cd evoquest
```

e abrir o `index.html` no navegador.

**Opção 2 — servidor local (recomendado)**

```bash
python3 -m http.server 8000
```

e acessar `http://localhost:8000`.

No primeiro acesso você cria o personagem e, em seguida, os atributos que representam sua vida — o app começa vazio de propósito.

---

## 🗺️ Roadmap

Ideias para o futuro — nada disso existe ainda:

### 🚧 Próximos passos

- [ ] Sprites/imagens no lugar dos avatares emoji;
- [ ] Mais itens cosméticos e efeitos visuais de fundo;
- [ ] Streaks diários;
- [ ] Estatísticas e gráficos de evolução;
- [ ] Bosses e desafios;
- [ ] Classes com habilidades próprias;
- [ ] PWA;
- [ ] Notificações;
- [ ] Sincronização em nuvem;
- [ ] Exportar/importar save.

---

## 💭 Filosofia do projeto

Produtividade costuma ser apresentada como obrigação. O EvoQuest parte do oposto: o progresso pessoal pode ser algo visual, tangível e divertido, como em um RPG — e ver o próprio atributo subir de nível é, muitas vezes, o empurrão que uma lista de tarefas comum não dá.

Boa arquitetura > quantidade de funcionalidades. Simplicidade > abstração.

---

## 🤝 Contribuindo

Projeto pessoal, mas sugestões, issues e pull requests são bem-vindos. Se contribuir, mantenha o espírito do MVP: simplicidade primeiro.

---

## 📄 Licença

A licença ainda não foi definida.
