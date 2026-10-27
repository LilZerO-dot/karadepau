/* Página de checkout: resumo, validação do formulário e envio para pagamento. */
const $ = sel => document.querySelector(sel);
const form = $("#formCheckout");

function renderResumo() {
  const itens = Carrinho.detalhado();
  if (!itens.length) {
    $("#checkout").innerHTML = `
      <div class="vazio-pagina">
        <h1>Seu carrinho está vazio</h1>
        <a href="index.html" class="botao">Ver as peças</a>
      </div>`;
    return false;
  }
  $("#resumoItens").innerHTML = itens.map(({ qtd, produto: p }) => `
    <div class="item">
      <img src="${p.imagem}" alt="" onerror="imagemProvisoria(this)">
      <div><p class="item-nome">${qtd}× ${p.nome}</p><p class="item-preco">${moeda(p.preco * qtd)}</p></div>
    </div>`).join("");
  const sub = Carrinho.subtotal(), frete = Carrinho.frete();
  const f = Frete.atual();
  $("#resumoTotais").innerHTML = `
    <div class="linha"><span>Subtotal</span><span>${moeda(sub)}</span></div>
    <div class="linha"><span>Frete${f?.escolhida ? ` (${f.escolhida.transportadora} ${f.escolhida.nome})` : ""}</span>
      <span>${frete === null ? "Informe o CEP" : moeda(frete)}</span></div>
    <div class="linha total"><span>Total</span><span>${moeda(sub + (frete || 0))}</span></div>`;
  $("#freteCheckout").innerHTML = htmlOpcoesFrete("freteCheckout");
  return true;
}

function atualizarFrete(cep) {
  const r = Frete.definirCep(cep);
  if (r.erro) $("#freteCheckout").innerHTML = `<p class="erro">${r.erro}</p>`;
}

// Máscaras simples
const mascaras = {
  cpf: v => v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  cep: v => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"),
  telefone: v => v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2"),
  uf: v => v.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2)
};

function cpfValido(cpf) {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += n[i] * (t + 1 - i);
    if ((soma * 10 % 11) % 10 !== Number(n[t])) return false;
  }
  return true;
}

// Preenche o endereço pelo CEP (ViaCEP, serviço público gratuito)
async function buscarCep(cep) {
  const n = cep.replace(/\D/g, "");
  if (n.length !== 8) return;
  $("#statusCep").textContent = "Buscando endereço…";
  try {
    const r = await fetch(`https://viacep.com.br/ws/${n}/json/`);
    const d = await r.json();
    if (d.erro) throw 0;
    form.rua.value = d.logradouro || form.rua.value;
    form.bairro.value = d.bairro || form.bairro.value;
    form.cidade.value = d.localidade || form.cidade.value;
    form.uf.value = d.uf || form.uf.value;
    $("#statusCep").textContent = "";
    form.numero.focus();
  } catch {
    $("#statusCep").textContent = "Não achei esse CEP. Preencha o endereço manualmente.";
  }
}

function validar() {
  let ok = true;
  form.querySelectorAll("input[required]").forEach(i => {
    let valido = i.value.trim() !== "";
    if (i.name === "email") valido = /^\S+@\S+\.\S+$/.test(i.value);
    if (i.name === "cpf") valido = cpfValido(i.value);
    if (i.name === "cep") valido = i.value.replace(/\D/g, "").length === 8;
    if (i.name === "telefone") valido = i.value.replace(/\D/g, "").length >= 10;
    i.classList.toggle("invalido", !valido);
    if (!valido) ok = false;
  });
  return ok;
}

function freteEscolhido() { return Frete.atual()?.escolhida || null; }

function montarPedido() {
  const dados = Object.fromEntries(new FormData(form));
  const itens = Carrinho.detalhado();
  const subtotal = Carrinho.subtotal();
  const envio = freteEscolhido();
  const frete = envio.preco;
  return {
    numero: "KDP-" + Date.now().toString().slice(-6),
    data: new Date().toISOString(),
    cliente: { nome: dados.nome, email: dados.email, telefone: dados.telefone, cpf: dados.cpf },
    entrega: {
      cep: dados.cep, rua: dados.rua, numero: dados.numero, complemento: dados.complemento,
      bairro: dados.bairro, cidade: dados.cidade, uf: dados.uf
    },
    envio: { transportadora: envio.transportadora, servico: envio.nome, prazo: envio.prazo, valor_estimado: envio.preco },
    pagamento: dados.pagamento,
    itens: itens.map(i => ({ id: i.id, titulo: i.produto.nome, quantidade: i.qtd, preco_unitario: i.produto.preco })),
    subtotal, frete, total: subtotal + frete
  };
}

/*
  ===================== INTEGRAÇÃO MERCADO PAGO =====================
  Hoje o pagamento é SIMULADO. Para ativar o Mercado Pago (Checkout Pro):

  1. Crie uma conta em https://www.mercadopago.com.br/developers e pegue
     o Access Token (fica SÓ no servidor, nunca neste arquivo).
  2. Crie um pequeno servidor/função (ex.: Netlify/Vercel Function) com a
     rota POST /api/criar-preferencia que recebe o "pedido" abaixo e chama
     POST https://api.mercadopago.com/checkout/preferences com:
       items: pedido.itens -> { title, quantity, unit_price, currency_id: "BRL" }
       shipments: { cost: pedido.frete }
       payer: { name, email, identification: { type: "CPF", number } }
       back_urls: { success: ".../obrigado.html", failure: ".../checkout.html", pending: ".../obrigado.html" }
       external_reference: pedido.numero
     e devolve o "init_point" da resposta.
  3. Troque MODO_SIMULADO para false. O cliente será levado ao Mercado Pago.
  ====================================================================
*/
const MODO_SIMULADO = LOJA.modoTeste;
const URL_CRIAR_PREFERENCIA = "/api/criar-preferencia";

async function iniciarPagamento(pedido) {
  if (MODO_SIMULADO) {
    await new Promise(r => setTimeout(r, 900)); // simula a ida ao Mercado Pago
    return "obrigado.html?status=approved&pedido=" + encodeURIComponent(pedido.numero);
  }
  const resposta = await fetch(URL_CRIAR_PREFERENCIA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido)
  });
  if (!resposta.ok) throw new Error("Falha ao criar pagamento");
  const { init_point } = await resposta.json();
  return init_point;
}

Object.keys(mascaras).forEach(campo => {
  form[campo]?.addEventListener("input", e => { e.target.value = mascaras[campo](e.target.value); });
});
form.cep?.addEventListener("blur", e => buscarCep(e.target.value));
form.cep?.addEventListener("input", e => {
  if (e.target.value.replace(/\D/g, "").length === 8) atualizarFrete(e.target.value);
});
if (Frete.ler().cep) form.cep.value = Frete.ler().cep;
document.addEventListener("carrinho:mudou", renderResumo);
form.addEventListener("input", e => e.target.classList.remove("invalido"));

form.addEventListener("submit", async e => {
  e.preventDefault();
  $("#erroForm").textContent = "";
  if (!validar()) {
    $("#erroForm").textContent = "Confira os campos destacados.";
    form.querySelector(".invalido")?.focus();
    return;
  }
  if (!freteEscolhido()) {
    $("#erroForm").textContent = "Escolha uma opção de frete.";
    form.cep.focus();
    return;
  }
  const botao = $("#botaoPagar");
  botao.disabled = true;
  botao.textContent = "Abrindo pagamento…";
  try {
    const pedido = montarPedido();
    try { localStorage.setItem("karadepau_ultimo_pedido", JSON.stringify(pedido)); } catch {}
    window.location.href = await iniciarPagamento(pedido);
  } catch {
    $("#erroForm").textContent = "Não foi possível iniciar o pagamento. Tente novamente.";
    botao.disabled = false;
    botao.textContent = "Ir para o pagamento";
  }
});

renderResumo();
