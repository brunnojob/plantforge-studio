<div align="center">

<img src="docs/mark.svg" width="80" alt="PlantForge Studio">

# PlantForge Studio

### Desenhe o espaço. Conecte os componentes. Experimente o cenário.

Um laboratório visual de plantas e automação conceitual para plataformas offshore, mercados autônomos e espaços comerciais — direto no navegador, sem escrever lógica de PLC ou configurar um SCADA.

[Abrir o Studio](https://brunnojob.github.io/plantforge-studio/) · [Começar em 5 minutos](#começar-em-5-minutos) · [Como funciona](#como-funciona) · [Créditos](#créditos)

</div>

---

## Da ideia ao primeiro cenário

PlantForge aproxima desenho 2D e experimentação de automação em uma única interface. Monte um deck de processo, organize uma loja autônoma e observe como regras simples alteram os estados dos componentes. Inspirado na facilidade de montagem de ferramentas como Tinkercad, com foco em espaços e operações.

**Sem conta. Sem backend. Sem dependências de produção.** Os projetos ficam no navegador e podem ser levados para outro computador por JSON.

| Desenhar | Configurar | Simular | Compartilhar |
| --- | --- | --- | --- |
| Posicione componentes em uma grade | Edite nome, dimensões, rotação e estado base | Defina condição, limite, destino e ação | Exporte JSON, SVG ou imprima para PDF |

## O que já funciona

- Editor SVG com inserção, seleção, movimentação por arraste, grade, zoom e enquadramento.
- Edição numérica de posição, largura, altura, rotação e valor de sensor.
- Biblioteca com 16 tipos: paredes, zonas, portas, bombas, tanques, válvulas, geradores, sensores de gás, temperatura e presença, alarmes, luminárias, acessos, gôndolas, self-checkouts e refrigeradores.
- Modelos iniciais para deck offshore e mercado autônomo.
- Conexões esquemáticas direcionadas entre componentes.
- Regras visuais com operadores maior, menor ou igual e ações ligar/abrir ou desligar/fechar.
- Monitor que explica as regras acionadas e destaca conflitos.
- Desfazer/refazer, duplicação e exclusão com remoção das referências relacionadas.
- Salvamento local automático, importação validada de JSON e exportação SVG.
- Layout adaptável, lista alternativa à seleção na planta e suporte a movimento reduzido.
- Testes do domínio e validação automática em pull requests e na branch principal.

## Começar em 5 minutos

1. Abra o [Studio](https://brunnojob.github.io/plantforge-studio/).
2. Experimente o modelo offshore carregado inicialmente.
3. Selecione `GD-101` e altere **Valor do sensor** para `45`.
4. Clique em **Simular**. A regra de gás desliga `P-101` e aciona `AL-101`.
5. Ajuste o valor para `0`. Os estados retornam à configuração base, porque as regras são reavaliadas sem retenção.
6. Escolha **Salvar JSON** para guardar um backup ou **Exportar SVG** para continuar a composição em um editor vetorial.

Para montar uma nova planta, escolha um item da biblioteca e clique no desenho. A ferramenta permanece ativa para permitir várias inserções; pressione `V` ou `Esc` para voltar à seleção. Em **Conectar**, clique primeiro na origem e depois no destino.

Para usar o editor sem arrastar, escolha um item em **Componentes na planta** e altere os campos X/Y. `Ctrl+Z` desfaz; `Ctrl+Shift+Z` refaz; `Delete` exclui o componente selecionado. No macOS, use Command no lugar de Ctrl.

## Como funciona

| Camada | Arquivo | Responsabilidade |
| --- | --- | --- |
| Documento e catálogo | `src/model.js` | Componentes, modelos, validação, referências e histórico |
| Motor de cenário | `src/simulation.js` | Avaliação determinística, conflitos e estados calculados |
| Interface | `src/app.js` | Interações, renderização, arquivos e persistência |
| Apresentação | `src/style.css` | Tema, adaptação de telas e impressão |

### Semântica do motor

Os valores de sensores são inseridos manualmente. Cada avaliação começa pelos estados base dos componentes. Regras são avaliadas sobre os valores atuais; fontes desativadas são ignoradas. Duas ações incompatíveis sobre um mesmo destino geram um evento de conflito e **desligar tem prioridade**, independentemente da ordem das regras. Não há cascata, temporizadores nem retenção de estados.

Conexões indicam relações no desenho; elas não transmitem pressão, energia, fluidos ou sinais e não alimentam automaticamente o motor de regras. A grade considera 80 unidades SVG por metro. O indicador de área soma as zonas e inclui sobreposições. Dimensões são simplificadas e não incluem tolerâncias, espessuras ou verificações de norma.

### Arquivos e privacidade

O formato JSON usa `version: 1` e contém `name`, `items`, `connections` e `rules`. A importação valida tipos, geometria, IDs e referências. Limites: arquivo de 2 MB, 500 componentes, 1.000 conexões e 1.000 regras. Os rótulos são escapados na renderização.

O salvamento usa `localStorage` na chave `plantforge.v1`. A aplicação não possui analytics, login ou chamadas para serviços de simulação. Limpar os dados do navegador remove o salvamento local; mantenha backups JSON. A infraestrutura do GitHub Pages segue as políticas do próprio GitHub.

## Executar localmente

Requisitos: Node.js 22+ para verificações e Python 3 para o servidor de desenvolvimento. Não é necessário instalar pacotes.

```bash
git clone https://github.com/brunnojob/plantforge-studio.git
cd plantforge-studio
npm run dev
```

Abra `http://localhost:5173`. Módulos ES precisam de um servidor HTTP; abrir o HTML diretamente por `file://` não é suportado.

```bash
npm run check
npm test
```

Os testes cobrem limites de sensores, recuperação do estado base, conflitos independentes de ordem, sensores desligados, regras de comércio, limpeza de referências, importação inválida e histórico.

## Publicação no GitHub Pages

O projeto é estático e usa caminhos relativos, adequado a subdiretórios do Pages. Em **Settings → Pages**, selecione **Deploy from a branch → main → /(root)**. O arquivo `.nojekyll` mantém a publicação direta. Alterações na `main` atualizam o site pelo fluxo de publicação do GitHub Pages; o workflow `Validate` verifica a sintaxe e os testes de domínio separadamente.

## Escopo desta versão

Esta é uma primeira versão funcional para estudo e prototipagem conceitual. Não substitui AutoCAD, ferramentas CAD profissionais, análise de engenharia, simulação física ou validação de sistemas de segurança. Não se conecta a PLCs, SCADA, sensores, máquinas ou processos reais. Não importa/exporta DWG ou DXF; a integração vetorial disponível é SVG.

Evoluções planejadas: camadas, cotas dedicadas, desenho livre de paredes, exclusão individual de conexões, seleção múltipla, cenários temporizados, importação DXF e cobertura de interface automatizada. Esses recursos ainda não fazem parte da versão atual.

## Contribuir

Abra uma issue com o problema, o comportamento esperado, passos para reproduzir e um JSON mínimo sem dados privados. Para contribuir com código, mantenha as regras do domínio independentes da interface e inclua testes quando alterar a semântica de simulação ou de importação.

## Créditos

Criado para **brunnodev** por **[brunnojob](https://github.com/brunnojob)**.

**[brunnodev.store](https://brunnodev.store)**

Distribuído sob a licença MIT. AutoCAD e Tinkercad são marcas de seus respectivos titulares; este projeto é independente e não possui afiliação com a Autodesk.
