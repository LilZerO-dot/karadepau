/* Vitrine, detalhe do produto e gaveta do carrinho (index.html). */
const $ = sel => document.querySelector(sel);
let filtroAtual = "Todas";

function renderFiltros() {
  const categorias = ["Todas", ...new Set(PRODUTOS.map(p => p.categoria))];
  $("#filtros").innerHTML = categorias.map(c =>
    `<button class="filtro ${c === filtroAtual ? "ativo" : ""}" data-cat="${c}">${c}</button>`).join("");
}

function renderVitrine() {
  const lista = PRODUTOS.filter(p => filtroAtual === "Todas" || p.categoria === filtroAtual);
  $("#grade").innerHTML = lista.map(p => `
    <article class="card">
      <button class="card-foto" data-detalhe="${p.id}" aria-label="Ver ${p.nome}">
        <img src="${p.imagem}" alt="${p.nome}" loading="lazy" onerror="imagemProvisoria(this)">
        ${p.estoque === 1 ? '<span class="etiqueta">Peça única</span>' : ""}
        ${p.estoque === 0 ? '<span class="etiqueta esgotado">Esgotado</span>' : ""}
      </button>
      <div class="card-info">
        <p class="card-cat">${p.categoria}</p>
        <h3>${p.nome}</h3>
        <p class="preco">${moeda(p.preco)}</p>
        <button class="botao" data-add="${p.id}" ${p.estoque === 0 ? "disabled" : ""}>
          ${p.estoque === 0 ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
      </div>
    </article>`).join("");
}

function abrirDetalhe(id) {
  const p = buscarProduto(id);
  const dlg = $("#detalhe");
  dlg.innerHTML = `
    <button class="fechar" data-fechar-detalhe aria-label="Fechar">✕</button>
    <img src="${p.imagem}" alt="${p.nome}" onerror="imagemProvisoria(this)">
    <div class="detalhe-info">
      <p class="card-cat">${p.categoria}</p>
      <h2>${p.nome}</h2>
      <p class="preco">${moeda(p.preco)}</p>
      <p>${p.descricao}</p>
      <p class="medidas"><strong>Medidas:</strong> ${p.medidas}</p>
      <p class="medidas">${p.estoque > 0 ? `${p.estoque} disponível(is)` : "Esgotado"}</p>
      <button class="botao" data-add="${p.id}" ${p.estoque === 0 ? "disabled" : ""}>Adicionar ao carrinho</button>
    </div>`;
  dlg.showModal();
}

function renderCarrinho() {
  const itens = Carrinho.detalhado();
  if (!itens.length) {
    $("#itensCarrinho").innerHTML = `<p class="vazio">Seu carrinho está vazio.</p>`;
    $("#resumoCarrinho").innerHTML = "";
    return;
  }
  $("#itensCarrinho").innerHTML = itens.map(({ id, qtd, produto: p }) => `
    <div class="item">
      <img src="${p.imagem}" alt="" onerror="imagemProvisoria(this)">
      <div>
        <p class="item-nome">${p.nome}</p>
        <p class="item-preco">${moeda(p.preco)}</p>
        <div class="qtd">
          <button data-qtd="${id}" data-valor="${qtd - 1}" aria-label="Diminuir">−</button>
          <span>${qtd}</span>
          <button data-qtd="${id}" data-valor="${qtd + 1}" aria-label="Aumentar" ${qtd >= p.estoque ? "disabled" : ""}>+</button>
          <button class="remover" data-qtd="${id}" data-valor="0">remover</button>
        </div>
      </div>
    </div>`).join("");
  const sub = Carrinho.subtotal(), frete = Carrinho.frete();
  const cep = Frete.ler().cep || "";
  $("#resumoCarrinho").innerHTML = `
    <form class="frete-calc" id="formFrete">
      <label for="cepFrete">Calcular frete</label>
      <div class="frete-linha">
        <input id="cepFrete" inputmode="numeric" placeholder="Seu CEP" value="${cep}" maxlength="9">
        <button class="botao" type="submit">Calcular</button>
      </div>
      <p class="erro" id="erroFrete"></p>
    </form>
    ${htmlOpcoesFrete("freteCarrinho")}
    <div class="linha"><span>Subtotal</span><span>${moeda(sub)}</span></div>
    <div class="linha"><span>Frete</span><span>${frete === null ? "Calcule acima" : moeda(frete)}</span></div>
    <div class="linha total"><span>Total</span><span>${moeda(sub + (frete || 0))}</span></div>
    <a href="checkout.html" class="botao largo">Finalizar compra</a>`;
}

function mascaraCep(v) { return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); }

document.addEventListener("submit", e => {
  if (e.target.id !== "formFrete") return;
  e.preventDefault();
  const r = Frete.definirCep($("#cepFrete").value);
  if (r.erro) $("#erroFrete").textContent = r.erro;
});
document.addEventListener("input", e => {
  if (e.target.id === "cepFrete") e.target.value = mascaraCep(e.target.value);
});

function abrirCarrinho() { $("#gaveta").classList.add("aberta"); $("#fundo").hidden = false; }
function fecharCarrinho() { $("#gaveta").classList.remove("aberta"); $("#fundo").hidden = true; }

let avisoTimer;
function aviso(texto) {
  const el = $("#aviso");
  el.textContent = texto;
  el.classList.add("visivel");
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove("visivel"), 2200);
}

document.addEventListener("click", e => {
  const t = e.target.closest("button, [data-fechar-detalhe]");
  if (!t) return;
  if (t.dataset.cat) { filtroAtual = t.dataset.cat; renderFiltros(); renderVitrine(); }
  if (t.dataset.detalhe) abrirDetalhe(t.dataset.detalhe);
  if (t.dataset.add) {
    Carrinho.adicionar(t.dataset.add);
    $("#detalhe").close();
    aviso("Adicionado ao carrinho");
  }
  if (t.dataset.qtd) Carrinho.alterar(t.dataset.qtd, Number(t.dataset.valor));
  if (t.hasAttribute("data-fechar-detalhe")) $("#detalhe").close();
});
$("#abrirCarrinho").addEventListener("click", abrirCarrinho);
$("#fecharCarrinho").addEventListener("click", fecharCarrinho);
$("#fundo").addEventListener("click", fecharCarrinho);
$("#detalhe").addEventListener("click", e => { if (e.target.id === "detalhe") e.target.close(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") fecharCarrinho(); });
document.addEventListener("carrinho:mudou", renderCarrinho);

$("#selo").textContent = LOJA.selo;
$("#ano").textContent = new Date().getFullYear();
// Só mostra o link do WhatsApp quando houver um número de verdade em js/produtos.js
if (/^0+$/.test(LOJA.whatsapp.slice(2))) $("#linkWhats").hidden = true;
else $("#linkWhats").href = `https://wa.me/${LOJA.whatsapp}`;
renderFiltros();
renderVitrine();
renderCarrinho();
