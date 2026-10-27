/* Carrinho compartilhado entre as páginas (salvo no navegador via localStorage). */
const CHAVE_CARRINHO = "karadepau_carrinho";

const Carrinho = {
  ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || []; }
    catch { return []; }
  },
  salvar(itens) {
    try { localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens)); } catch {}
    document.dispatchEvent(new CustomEvent("carrinho:mudou"));
  },
  adicionar(id, qtd = 1) {
    const produto = buscarProduto(id);
    if (!produto || produto.estoque <= 0) return;
    const itens = Carrinho.ler();
    const item = itens.find(i => i.id === id);
    if (item) item.qtd = Math.min(item.qtd + qtd, produto.estoque);
    else itens.push({ id, qtd: Math.min(qtd, produto.estoque) });
    Carrinho.salvar(itens);
  },
  alterar(id, qtd) {
    const produto = buscarProduto(id);
    let itens = Carrinho.ler();
    if (qtd <= 0) itens = itens.filter(i => i.id !== id);
    else {
      const item = itens.find(i => i.id === id);
      if (item) item.qtd = Math.min(qtd, produto ? produto.estoque : qtd);
    }
    Carrinho.salvar(itens);
  },
  limpar() { Carrinho.salvar([]); },
  // Itens com dados do produto; ignora ids que saíram do catálogo
  detalhado() {
    return Carrinho.ler()
      .map(i => ({ ...i, produto: buscarProduto(i.id) }))
      .filter(i => i.produto);
  },
  quantidade() { return Carrinho.ler().reduce((s, i) => s + i.qtd, 0); },
  subtotal() { return Carrinho.detalhado().reduce((s, i) => s + i.qtd * i.produto.preco, 0); },
  // Preço do frete escolhido (js/frete.js), ou null se o cliente ainda não calculou
  frete() {
    if (!Carrinho.ler().length) return 0;
    const f = Frete.atual();
    return f && f.escolhida ? f.escolhida.preco : null;
  }
};

function buscarProduto(id) { return PRODUTOS.find(p => p.id === id); }

function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Se a foto ainda não estiver na pasta "imagens", mostra um desenho provisório
function imagemProvisoria(img) {
  img.onerror = null;
  img.src = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#5b3a21"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <path d="M0 90 Q100 70 200 95 T400 85 M0 160 Q120 140 220 165 T400 150 M0 225 Q90 210 200 230 T400 220"
        stroke="#d9a441" stroke-opacity=".55" stroke-width="5" fill="none"/>
      <text x="200" y="285" font-family="sans-serif" font-size="16" fill="#f3e6d3" text-anchor="middle">foto em breve</text>
    </svg>`);
}

function atualizarContador() {
  document.querySelectorAll("[data-contador]").forEach(el => {
    const n = Carrinho.quantidade();
    el.textContent = n;
    el.hidden = n === 0;
  });
}
function mostrarAvisoTeste() {
  if (!LOJA.modoTeste) return;
  const faixa = document.createElement("div");
  faixa.className = "faixa-teste";
  faixa.textContent = "Loja em fase de testes: as compras ainda não são cobradas nem enviadas.";
  document.body.prepend(faixa);
}

// Botão "A+" para aumentar as letras (a escolha fica salva no navegador)
const CHAVE_LETRA = "karadepau_letra_grande";
function aplicarLetraGrande(ligado) {
  document.documentElement.classList.toggle("letra-grande", ligado);
  const botao = document.querySelector(".botao-letra");
  if (botao) {
    botao.textContent = ligado ? "A−" : "A+";
    botao.setAttribute("aria-label", ligado ? "Diminuir as letras" : "Aumentar as letras");
    botao.setAttribute("aria-pressed", ligado);
  }
}
function criarBotaoLetra() {
  const menu = document.querySelector(".menu") || document.querySelector(".topo");
  if (!menu) return;
  const botao = document.createElement("button");
  botao.className = "botao-letra";
  botao.type = "button";
  botao.addEventListener("click", () => {
    const ligado = !document.documentElement.classList.contains("letra-grande");
    try { localStorage.setItem(CHAVE_LETRA, ligado ? "1" : ""); } catch {}
    aplicarLetraGrande(ligado);
  });
  if (menu.classList.contains("menu")) menu.prepend(botao); else menu.append(botao);
  let salvo = false;
  try { salvo = localStorage.getItem(CHAVE_LETRA) === "1"; } catch {}
  aplicarLetraGrande(salvo);
}

document.addEventListener("carrinho:mudou", atualizarContador);
document.addEventListener("DOMContentLoaded", () => { atualizarContador(); mostrarAvisoTeste(); criarBotaoLetra(); });
