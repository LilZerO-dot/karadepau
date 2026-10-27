/*
  CÁLCULO DE FRETE — ESTIMATIVA (beta)
  Os valores abaixo são uma tabela aproximada por região e peso, sem consultar
  nenhuma transportadora. Servem para o cliente ter uma noção antes de comprar.

  Para trocar por cotação real depois: implemente cotarFreteReal() chamando um
  servidor seu que use a API do Melhor Envio (Correios, Jadlog, Loggi, Azul...)
  ou do Frenet. O token dessas APIs fica no servidor, nunca neste arquivo.
  Basta devolver a mesma lista de opções { id, nome, transportadora, preco, prazo }.
*/
const FRETE = {
  origemUF: "SC",          // estado de onde as peças saem
  pesoPadraoKg: 4,         // peso usado quando o produto não tem "peso"
  embalagemKg: 0.5,        // caixa e proteção, por pedido

  // [preço até 1 kg, preço por kg adicional, prazo mín, prazo máx] por região
  servicos: [
    { id: "pac", nome: "PAC", transportadora: "Correios", tabela: {
        estado:   [24, 3.5, 3, 6],  vizinho: [30, 5, 5, 8],   sudeste: [34, 6.5, 6, 9],
        centro:   [40, 8, 7, 11],   nordeste: [48, 11, 9, 14], norte:  [55, 13, 10, 16] } },
    { id: "sedex", nome: "SEDEX", transportadora: "Correios", tabela: {
        estado:   [32, 6, 1, 2],    vizinho: [42, 9, 2, 3],   sudeste: [52, 12, 2, 4],
        centro:   [62, 15, 3, 5],   nordeste: [78, 21, 4, 6], norte:  [88, 25, 5, 8] } },
    { id: "jadlog", nome: ".Package", transportadora: "Jadlog", tabela: {
        estado:   [21, 3, 2, 4],    vizinho: [26, 4.5, 4, 6], sudeste: [30, 5.5, 5, 7],
        centro:   [36, 7, 6, 9],    nordeste: [44, 9.5, 8, 12], norte: [52, 12, 10, 15] } },
    { id: "loggi", nome: "Expresso", transportadora: "Loggi", tabela: {
        estado:   [23, 3.5, 2, 3],  vizinho: [28, 5, 3, 5],   sudeste: [33, 6, 3, 6],
        centro:   [40, 8, 5, 8],    nordeste: [50, 11, 6, 10], norte:  null } }
  ]
};

// Faixas de CEP por estado (Correios)
const FAIXAS_CEP = [
  ["SP", 1000, 19999], ["RJ", 20000, 28999], ["ES", 29000, 29999], ["MG", 30000, 39999],
  ["BA", 40000, 48999], ["SE", 49000, 49999], ["PE", 50000, 56999], ["AL", 57000, 57999],
  ["PB", 58000, 58999], ["RN", 59000, 59999], ["CE", 60000, 63999], ["PI", 64000, 64999],
  ["MA", 65000, 65999], ["PA", 66000, 68899], ["AP", 68900, 68999], ["AM", 69000, 69299],
  ["RR", 69300, 69399], ["AM", 69400, 69899], ["AC", 69900, 69999], ["DF", 70000, 73699],
  ["GO", 72800, 76799], ["TO", 77000, 77999], ["MT", 78000, 78899], ["RO", 76800, 76999],
  ["MS", 79000, 79999], ["PR", 80000, 87999], ["SC", 88000, 89999], ["RS", 90000, 99999]
];
const REGIOES = {
  sul: ["PR", "SC", "RS"], sudeste: ["SP", "RJ", "MG", "ES"], centro: ["DF", "GO", "MT", "MS"],
  nordeste: ["BA", "SE", "PE", "AL", "PB", "RN", "CE", "PI", "MA"], norte: ["PA", "AP", "AM", "RR", "AC", "RO", "TO"]
};

function ufDoCep(cep) {
  const n = Number(String(cep).replace(/\D/g, "").slice(0, 5));
  const faixa = FAIXAS_CEP.find(([, ini, fim]) => n >= ini && n <= fim);
  return faixa ? faixa[0] : null;
}

function zonaDestino(uf) {
  if (uf === FRETE.origemUF) return "estado";
  const regiao = Object.keys(REGIOES).find(r => REGIOES[r].includes(uf));
  const regiaoOrigem = Object.keys(REGIOES).find(r => REGIOES[r].includes(FRETE.origemUF));
  return regiao === regiaoOrigem ? "vizinho" : regiao;
}

function pesoDoCarrinho() {
  const itens = Carrinho.detalhado();
  if (!itens.length) return 0;
  return itens.reduce((s, i) => s + i.qtd * (i.produto.peso || FRETE.pesoPadraoKg), 0) + FRETE.embalagemKg;
}

// Devolve { uf, peso, opcoes: [...] } ou { erro }
function calcularFrete(cep) {
  if (String(cep).replace(/\D/g, "").length !== 8) return { erro: "Digite um CEP com 8 números." };
  const uf = ufDoCep(cep);
  if (!uf) return { erro: "Não reconheci esse CEP. Confira os números." };
  const zona = zonaDestino(uf);
  const peso = pesoDoCarrinho();
  const kg = Math.ceil(peso);
  const opcoes = FRETE.servicos
    .filter(s => s.tabela[zona])
    .map(s => {
      const [base, porKg, min, max] = s.tabela[zona];
      return {
        id: s.id, nome: s.nome, transportadora: s.transportadora,
        preco: Math.round((base + porKg * Math.max(kg - 1, 0)) * 100) / 100,
        prazo: `${min} a ${max} dias úteis`
      };
    })
    .sort((a, b) => a.preco - b.preco);
  return { uf, peso, opcoes };
}

/* ---- Escolha do cliente (salva no navegador) ---- */
const CHAVE_FRETE = "karadepau_frete";
const Frete = {
  ler() { try { return JSON.parse(localStorage.getItem(CHAVE_FRETE)) || {}; } catch { return {}; } },
  salvar(dados) {
    try { localStorage.setItem(CHAVE_FRETE, JSON.stringify(dados)); } catch {}
    document.dispatchEvent(new CustomEvent("carrinho:mudou"));
  },
  // Recalcula com o carrinho atual (o peso muda quando o carrinho muda)
  atual() {
    const { cep, opcaoId } = Frete.ler();
    if (!cep) return null;
    const r = calcularFrete(cep);
    if (r.erro) return null;
    const escolhida = r.opcoes.find(o => o.id === opcaoId) || null;
    return { cep, ...r, escolhida };
  },
  definirCep(cep) {
    const r = calcularFrete(cep);
    if (r.erro) return r;
    const anterior = Frete.ler().opcaoId;
    const opcaoId = r.opcoes.some(o => o.id === anterior) ? anterior : r.opcoes[0].id;
    Frete.salvar({ cep, opcaoId });
    return r;
  },
  escolher(opcaoId) { Frete.salvar({ ...Frete.ler(), opcaoId }); }
};

// HTML do bloco de frete, usado no carrinho e no checkout
function htmlOpcoesFrete(grupo) {
  const f = Frete.atual();
  if (!f) return "";
  return `
    <p class="frete-destino">Envio para ${f.uf} · ${f.peso.toLocaleString("pt-BR")} kg (estimado)</p>
    <div class="frete-opcoes">
      ${f.opcoes.map(o => `
        <label class="frete-opcao">
          <input type="radio" name="${grupo}" value="${o.id}" ${f.escolhida?.id === o.id ? "checked" : ""} data-frete-opcao>
          <span class="frete-nome"><strong>${o.transportadora} ${o.nome}</strong><small>${o.prazo}</small></span>
          <span class="frete-preco">${moeda(o.preco)}</span>
        </label>`).join("")}
    </div>
    <p class="nota">Valores estimados. O valor final é confirmado no envio.</p>`;
}

document.addEventListener("change", e => {
  if (e.target.matches("[data-frete-opcao]")) Frete.escolher(e.target.value);
});
