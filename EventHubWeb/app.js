// --- CONFIGURAÇÃO DAS APIS ---
const BASE_URL = "http://177.44.248.77";

const APIS = {
    AUTH: `${BASE_URL}/auth`,
    USUARIOS: `${BASE_URL}/usuarios`,
    EVENTOS: `${BASE_URL}/eventos`,
    PRESENCAS: `${BASE_URL}/presencas`,
    INSCRICOES: `${BASE_URL}/inscricoes`,
    CERTIFICADOS: `${BASE_URL}/certificados`,
    EMAILS: `${BASE_URL}/emails`
};

// --- UTILITÁRIOS ---
function lerIdDoToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload).id;
    } catch (e) { return null; }
}

function salvarSessao(token, email) {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    if (token !== 'TOKEN_OFFLINE') {
        const idReal = lerIdDoToken(token);
        if (idReal) localStorage.setItem('usuarioId', idReal);
    } else {
        if(!localStorage.getItem('usuarioId')) localStorage.setItem('usuarioId', Date.now());
    }
}

function getNomeEventoPorId(id) {
    const eventos = JSON.parse(localStorage.getItem('cache_eventos') || '[]');
    const evento = eventos.find(e => e.id === id);
    return evento ? evento.nome : "evento";
}

function verificarAutenticacao() { if (!localStorage.getItem('token')) window.location.href = 'index.html'; }
function logout() { 
    localStorage.removeItem('token'); 
    localStorage.removeItem('email');
    localStorage.removeItem('usuarioId');
    window.location.href = 'index.html'; 
}

// --- FUNÇÃO DE E-MAIL ---
async function enviarNotificacao(emailDestino, assunto, mensagem) {
    const token = localStorage.getItem('token'); // Precisa disto para funcionar!
    
    try {
        const resposta = await fetch(APIS.EMAILS, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token // O Token é obrigatório
            },
            body: JSON.stringify({ to: emailDestino, subject: assunto, body: mensagem })
        });

        if (resposta.ok) {
            console.log("E-MAIL ENVIADO COM SUCESSO!");
        } else {
            console.error("Erro no envio do e-mail. Status:", resposta.status);
            const erroTexto = await resposta.text();
            console.error("Detalhe:", erroTexto);
        }
    } catch (erro) { 
        console.error("Erro de conexão no e-mail:", erro); 
    }
}

// --- CORE: BUSCA DE DADOS (AGORA COM PRESENÇAS) ---
async function buscarDadosComCache() {
    const token = localStorage.getItem('token');
    const usuarioId = localStorage.getItem('usuarioId');
    const statusDiv = document.getElementById('statusConexao');

    try {
        // CORREÇÃO: Busca Eventos, Inscrições E PRESENÇAS
        const [resEventos, resInscricoes, resPresencas] = await Promise.all([
            fetch(APIS.EVENTOS, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`${APIS.INSCRICOES}/usuario/${usuarioId}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(APIS.PRESENCAS, { headers: { 'Authorization': 'Bearer ' + token } }) // Busca todas para filtrar
        ]);

        if (resEventos.ok && resInscricoes.ok && resPresencas.ok) {
            const eventos = await resEventos.json();
            const inscricoes = await resInscricoes.json();
            const todasPresencas = await resPresencas.json();
            
            // Filtra apenas as minhas
            const minhasPresencas = todasPresencas.filter(p => p.usuarioId == usuarioId);

            localStorage.setItem('cache_eventos', JSON.stringify(eventos));
            localStorage.setItem('cache_inscricoes', JSON.stringify(inscricoes));
            localStorage.setItem('cache_presencas', JSON.stringify(minhasPresencas));

            if(statusDiv) { statusDiv.className = "status online"; statusDiv.innerHTML = "Online 🟢 (Dados da Nuvem)"; }
            sincronizarAutomatico();
            
            return { eventos, inscricoes, presencas: minhasPresencas, online: true };
        } else { throw new Error("Erro API"); }

    } catch (err) {
        console.warn("Modo Offline.");
        const cacheEvt = localStorage.getItem('cache_eventos');
        const cacheIns = localStorage.getItem('cache_inscricoes');
        const cachePres = localStorage.getItem('cache_presencas');
        
        if (cacheEvt) {
            if(statusDiv) { statusDiv.className = "status offline"; statusDiv.innerHTML = "Offline 🔴 (Cache Local)"; }
            return { 
                eventos: JSON.parse(cacheEvt || '[]'),
                inscricoes: JSON.parse(cacheIns || '[]'),
                presencas: JSON.parse(cachePres || '[]'),
                online: false 
            };
        } else {
            if(statusDiv) statusDiv.innerHTML = "Offline 🔴 (Sem dados)";
            return null;
        }
    }
}

// --- RENDERIZAÇÃO DASHBOARD ---
async function carregarDashboard() {
    const dados = await buscarDadosComCache();
    if(!dados) return;

    const tbody = document.getElementById('listaCorpo');
    if (!tbody) return;
    tbody.innerHTML = "";
    
    // Configuração de Admin
    const emailRaw = localStorage.getItem('email');
    const emailLogado = emailRaw ? emailRaw.trim().toLowerCase() : "";
    const admins = ['admin@eventhub.com', 'staff@eventhub.com', 'josue@teste.com']; 
    const isAdmin = admins.includes(emailLogado);

    // Botão Global de Staff (Cabeçalho)
    const btnStaffGlobal = document.getElementById('btnStaff');
    if(btnStaffGlobal) btnStaffGlobal.style.display = isAdmin ? 'inline-block' : 'none';

    dados.eventos.forEach(ev => {
        // Busca se o usuário logado tem inscrição/presença neste evento
        // Nota: O '.find' procura nas inscrições DO USUÁRIO LOGADO (filtradas no buscarDados)
        const inscricaoEncontrada = dados.inscricoes.find(i => ((i.eventoId === ev.id) || (i.evento && i.evento.id === ev.id)) && i.status === 'ATIVA');
        const checkinEncontrado = dados.presencas.find(p => p.eventoId === ev.id);
        
        const tr = document.createElement('tr');
        let botoesHTML = "";

        // --- DIVISÃO CLARA DE PERFIS ---

        if (isAdmin) {
            // ====================================================
            // PERFIL 1: ADMIN / STAFF
            // O Admin vê SEMPRE as ferramentas de gestão, independente de estar inscrito
            // ====================================================
            
            const styleBtn = "padding: 5px 10px; margin-right: 5px; font-size: 12px; border: none; border-radius: 4px; color: white; cursor: pointer;";
            
            // Botão A: Apenas Inscrever (Azul)
            botoesHTML += `<button style="${styleBtn} background-color: #17a2b8;" onclick="executarAcaoAdmin(${ev.id}, 'INSCRICAO')" title="Apenas inscreve o usuário">Só Inscrever</button>`;

            // Botão B: Apenas Check-in (Verde Escuro)
            botoesHTML += `<button style="${styleBtn} background-color: #28a745;" onclick="executarAcaoAdmin(${ev.id}, 'CHECKIN')" title="Para quem já se inscreveu antes">Só Check-in</button>`;

            // Botão C: Combo Completo (Roxo)
            botoesHTML += `<button style="${styleBtn} background-color: #6f42c1;" onclick="executarAcaoAdmin(${ev.id}, 'TUDO')" title="Cadastra, inscreve e faz check-in">Completo</button>`;

        } else {
            // ====================================================
            // PERFIL 2: USUÁRIO COMUM (Visitante/Aluno)
            // Vê apenas o seu próprio status
            // ====================================================

            if (inscricaoEncontrada) {
                // Cenário: JÁ INSCRITO
                botoesHTML = `<span style="color: green; font-weight: bold;">Inscrito </span>`;
                
                if (checkinEncontrado) {
                    botoesHTML += `<span style="color: green; font-weight: bold;">e Check-in feito!</span>`;
                } else {
                    botoesHTML += ` <button class="btn-checkin" onclick="checkin(${ev.id})">Check-in</button>`;
                }
            } else {
                // Cenário: NÃO INSCRITO
                botoesHTML = `<button class="btn-acao" onclick="inscrever(${ev.id})">Inscrever-se</button>`;
            }
        }
        
        tr.innerHTML = `<td><strong>${ev.nome}</strong></td><td>${ev.descricao}</td><td>${ev.local}</td><td>${botoesHTML}</td>`;
        tbody.appendChild(tr);
    });
}

// --- TELA 2: MINHAS INSCRIÇÕES (Com Validação de Certificado) ---
async function carregarMinhasInscricoes() {
    const dados = await buscarDadosComCache();
    const tbody = document.getElementById('listaMinhasInscricoes');
    if (!tbody || !dados) return;
    tbody.innerHTML = "";

    const inscricoesAtivas = dados.inscricoes.filter(i => i.status === 'ATIVA');

    if (inscricoesAtivas.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Nenhuma inscrição ativa.</td></tr>";
        return;
    }

    inscricoesAtivas.forEach(inscricao => {
        let evento = inscricao.evento;
        if (!evento) {
            evento = dados.eventos.find(e => e.id === inscricao.eventoId) || { nome: "Evento", descricao: "-", local: "-", id: inscricao.eventoId };
        }

        // VERIFICAÇÃO DE PRESENÇA
        const temPresenca = dados.presencas && dados.presencas.some(p => p.eventoId === evento.id);
        
        let btnCertificado = "";
        if (temPresenca) {
            // Ativo
            btnCertificado = `<button class="btn-cert" onclick="certificado(${evento.id}, '${evento.nome}')">Certificado</button>`;
        } else {
            // Bloqueado (Cinza)
            btnCertificado = `<button class="btn-cert" style="background-color: #ccc; cursor: not-allowed;" onclick="alert('Realize o Check-in primeiro!')">Certificado</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${evento.nome}</strong></td>
            <td>${evento.descricao}</td>
            <td>${evento.local}</td>
            <td>
                <button class="btn-checkin" onclick="checkin(${evento.id})">Check-in</button>
                ${btnCertificado}
                <button class="btn-cancelar" onclick="cancelarInscricao(${inscricao.id})">Cancelar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- AÇÕES ---
async function inscrever(eventoId) {
    console.log("--- DEBUG: Início da Função Inscrever ---");

    // --- CORREÇÃO AQUI: Recuperar o ID do usuário ---
    const usuarioId = localStorage.getItem('usuarioId'); 
    // ------------------------------------------------

    // Verificação de segurança
    if (!usuarioId) {
        alert("Erro: ID do usuário não encontrado. Tente fazer login novamente.");
        return;
    }

    const nomeEvento = getNomeEventoPorId(eventoId);
    
    // Agora a variável 'usuarioId' existe e pode ser usada aqui embaixo
    if(await processarAcao(APIS.INSCRICOES, { usuarioId, eventoId }, "Inscrição")) {
        
        console.log("Inscrição OK. Preparando e-mail...");
        
        const email = localStorage.getItem('email');
        const assunto = `Confirmação: ${nomeEvento}`;
        const mensagem = `Olá! Sua inscrição no evento "${nomeEvento}" foi confirmada com sucesso.`;
        
        console.log("Enviando e-mail para:", email); 

        // Chama a função de e-mail (que já deve ter o Token, conforme ajustamos antes)
        await enviarNotificacao(email, assunto, mensagem);
        
        console.log("Fluxo finalizado. Recarregando...");
        
        // Pode descomentar o reload agora se quiseres, 
        // ou deixar comentado mais uma vez para ver os logs de sucesso
        window.location.reload(); 
    }
}

async function cancelarInscricao(inscricaoId) {
    const inscricoes = JSON.parse(localStorage.getItem('cache_inscricoes') || '[]');
    const presencas = JSON.parse(localStorage.getItem('cache_presencas') || '[]');
    
    // Busca a inscrição para saber qual é o evento
    const inscricaoAlvo = inscricoes.find(i => i.id === inscricaoId);
    let nomeEvento = "evento";

    if (inscricaoAlvo) {
        // Pega o nome do evento para usar no e-mail
        nomeEvento = inscricaoAlvo.evento ? inscricaoAlvo.evento.nome : getNomeEventoPorId(inscricaoAlvo.eventoId);

        const jaFezCheckin = presencas.some(p => p.eventoId === inscricaoAlvo.eventoId);
        if (jaFezCheckin) {
            alert("Operação Bloqueada!\n\nVocê já realizou o Check-in neste evento, por isso não pode mais cancelar a inscrição.");
            return;
        }
    }

    if(!confirm("Tem certeza que deseja cancelar sua inscrição?")) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${APIS.INSCRICOES}/${inscricaoId}`, {
            method: 'DELETE', 
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (res.ok) {
            alert("Inscrição cancelada com sucesso.");

            // DISPARO DO E-MAIL DE CANCELAMENTO
            const email = localStorage.getItem('email');
            const assunto = `Cancelamento: ${nomeEvento}`;
            const mensagem = `Sua inscrição no evento "${nomeEvento}" foi cancelada conforme solicitado.`;
            
            await enviarNotificacao(email, assunto, mensagem);

            window.location.reload(); 
        } else {
            alert("Erro ao cancelar. Tente novamente.");
        }
    } catch (e) { 
        console.error(e);
        alert("Erro de conexão com o servidor."); 
    }
}

async function checkin(eventoId) {
    const usuarioId = localStorage.getItem('usuarioId');
    const nomeEvento = getNomeEventoPorId(eventoId);

    if(await processarAcao(APIS.PRESENCAS, { usuarioId, eventoId }, "Check-in")) {
        
        const email = localStorage.getItem('email');
        const assunto = `Presença Confirmada: ${nomeEvento}`;
        const mensagem = `Bem-vindo! Seu check-in no evento "${nomeEvento}" foi registrado. Aproveite!`;

        // Aguarda o envio antes de recarregar
        await enviarNotificacao(email, assunto, mensagem);
        
        window.location.reload();
    }
}

async function certificado(eventoId, nomeEvento) {
    const usuarioId = localStorage.getItem('usuarioId');
    const token = localStorage.getItem('token');
    const nomeEventoPDF = nomeEvento || "Evento Acadêmico"; 

    try {
        // 1. BUSCA O NOME REAL DO USUÁRIO (ANTES DE EMITIR!)
        // Precisamos do nome para enviar ao Backend e gravar no certificado
        let nomeReal = "Participante";
        try {
            const resUser = await fetch(`${APIS.USUARIOS}/${usuarioId}`, { 
                headers: { 'Authorization': 'Bearer ' + token } 
            });
            if (resUser.ok) {
                const dadosUser = await resUser.json();
                nomeReal = dadosUser.nome; 
            }
        } catch (err) { console.error("Erro ao buscar nome", err); }

        // 2. EMITE O CERTIFICADO (Enviando os nomes junto!)
        const response = await fetch(APIS.CERTIFICADOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ 
                usuarioId: usuarioId, 
                eventoId: eventoId,
                // NOVOS CAMPOS PARA O BACKEND GUARDAR:
                nomeUsuario: nomeReal,
                nomeEvento: nomeEventoPDF
            })
        });
        
        if(response.ok) {
            const data = await response.json();
            const codigo = data.codigoAutenticacao;
            const dataEmissao = new Date().toLocaleDateString('pt-BR');

            if(confirm(`Certificado Gerado!\nCódigo: ${codigo}\n\nDeseja baixar o PDF agora?`)) {
                gerarPDF(nomeReal, nomeEventoPDF, dataEmissao, codigo);
            }
        } else {
            const erro = await response.text();
            alert("Aviso: " + erro); 
        }
    } catch (e) {
        alert("Erro ao emitir certificado. Verifique sua conexão.");
    }
}

function gerarPDF(nome, evento, data, codigo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const linkValidacao = `Valide em: http://177.44.248.77/validar.html?codigo=${codigo}`;
    doc.setLineWidth(3); doc.rect(10, 10, 277, 190);
    doc.setFont("helvetica", "bold"); doc.setFontSize(40); doc.setTextColor(0, 51, 102);
    doc.text("CERTIFICADO", 148.5, 40, null, null, "center");
    doc.setFontSize(20); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal");
    doc.text("Certificamos que", 148.5, 70, null, null, "center");
    doc.setFontSize(30); doc.setFont("times", "bolditalic");
    doc.text(nome, 148.5, 90, null, null, "center");
    doc.setFontSize(20); doc.setFont("helvetica", "normal");
    doc.text("participou do evento", 148.5, 110, null, null, "center");
    doc.setFontSize(26); doc.setFont("helvetica", "bold");
    doc.text(evento, 148.5, 130, null, null, "center");
    doc.setFontSize(14); doc.setFont("helvetica", "normal");
    doc.text(`Data: ${data}`, 20, 160);
    doc.setFontSize(10);
    doc.text(`Código: ${codigo}`, 148.5, 180, null, null, "center");
    doc.text(linkValidacao, 148.5, 188, null, null, "center");
    doc.save(`Certificado.pdf`);
}

// --- FLUXO VISITANTE ---
async function cadastrarECheckinVisitante(eventoId) {
    console.log("--- INICIANDO FLUXO DE VISITANTE ---");
    
    const nomeInput = prompt("Nome do Visitante:"); 
    if (!nomeInput) return;
    const email = prompt("E-mail do Visitante:"); 
    if (!email) return;
    
    // Vamos usar o token do ADMIN para fazer as operações, 
    // assim não dependemos da senha do visitante.
    const tokenAdmin = localStorage.getItem('token'); 
    
    try {
        // Teste de conexão
        if (!navigator.onLine) throw new Error("Offline");

        let usuarioId = null;
        let nomeReal = nomeInput;

        // 1. TENTA CRIAR O USUÁRIO
        const senhaPadrao = "123456";
        const resCriar = await fetch(APIS.USUARIOS, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nomeInput, email, senha: senhaPadrao })
        });

        if (resCriar.ok) {
            // CENÁRIO A: Usuário Novo Criado
            console.log("Usuário novo criado com sucesso.");
            // Tenta pegar o ID da resposta (se o backend retornar o objeto criado)
            try {
                const usuarioNovo = await resCriar.json();
                if(usuarioNovo && usuarioNovo.id) usuarioId = usuarioNovo.id;
            } catch(e) {} // Se não retornar JSON, seguimos para a busca
        } else {
            // CENÁRIO B: Erro na criação (Provavelmente já existe)
            console.log("Usuário não criado (Status " + resCriar.status + "). Verificando se já existe...");
        }

        // 2. SE NÃO TEMOS O ID (Porque já existia ou a criação não retornou ID)
        // Vamos buscar o usuário pelo e-mail para pegar o ID dele
        if (!usuarioId) {
            const resBusca = await fetch(APIS.USUARIOS, {
                headers: { 'Authorization': 'Bearer ' + tokenAdmin }
            });
            
            if (resBusca.ok) {
                const listaUsuarios = await resBusca.json();
                const usuarioEncontrado = listaUsuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
                
                if (usuarioEncontrado) {
                    usuarioId = usuarioEncontrado.id;
                    nomeReal = usuarioEncontrado.nome; // Usamos o nome real do cadastro
                    console.log("Usuário existente encontrado. ID:", usuarioId);
                }
            }
        }

        if (!usuarioId) {
            // Se chegou aqui e não temos ID, é um erro real (não é internet)
            throw new Error("Erro Crítico: Não foi possível criar nem encontrar o usuário.");
        }

        // 3. REALIZAR INSCRIÇÃO (Usando Token do Admin)
        // Ignoramos erro aqui (pode já estar inscrito)
        await fetch(APIS.INSCRICOES, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenAdmin },
            body: JSON.stringify({ usuarioId, eventoId })
        });

        // 4. REALIZAR CHECK-IN (Usando Token do Admin)
        const resPresenca = await fetch(APIS.PRESENCAS, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenAdmin },
            body: JSON.stringify({ usuarioId, eventoId })
        });

        if (resPresenca.ok || resPresenca.status === 400 || resPresenca.status === 409) {
            // 5. ENVIAR E-MAIL
            const nomeEvento = getNomeEventoPorId(eventoId);
            const assunto = `Acesso EventHub: ${nomeEvento}`;
            const mensagem = `Olá ${nomeReal}! Sua presença foi registrada no evento "${nomeEvento}".`;
            
            await enviarNotificacao(email, assunto, mensagem);

            alert(`SUCESSO!\n\nVisitante: ${nomeReal}\nSituação: Check-in Realizado com Sucesso!`);
            window.location.reload();
        } else {
            throw new Error("Falha ao registrar presença.");
        }

    } catch (erro) {
        // --- TRATAMENTO DE ERRO / OFFLINE ---
        console.warn("Erro no processo:", erro);
        const msg = erro.message || "";

        // Se for erro de internet, salva na fila
        if (msg === "Offline" || msg.includes("NetworkError") || msg.includes("Failed to fetch")) {
            console.warn("Sem conexão. Salvando visitante na fila...");
            salvarNaFila('VISITANTE_OFFLINE', 'SPECIAL', { 
                nome: nomeInput, 
                email: email, 
                eventoId: eventoId 
            });
            alert(`Sem internet.\n\nO visitante "${nomeInput}" foi salvo na fila e será sincronizado depois.`);
            verificarPendencias();
        } else {
            // Se for outro erro (ex: erro de servidor), mostra alerta e NÃO salva
            alert(`Erro: ${msg.replace("Error:", "")}`);
        }
    }
}

async function processarAcao(url, corpo, tipo) {
    const token = localStorage.getItem('token');
    try {
        if(token === 'TOKEN_OFFLINE') throw new Error("Offline");
        const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(corpo)
        });
        if (res.ok) { alert(`${tipo} Sucesso!`); return true; }
        else { alert(await res.text()); return false; }
    } catch (err) {
        salvarNaFila(tipo, url, corpo);
        alert(`Sem internet. ${tipo} salvo! Será sincronizado depois.`);
        verificarPendencias();
        return false;
    }
}

// --- SINCRONIZAÇÃO ---
function salvarNaFila(tipo, url, corpo) {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    fila.push({ tipo, url, corpo });
    localStorage.setItem('fila_sync', JSON.stringify(fila));
}

function verificarPendencias() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    const btn = document.getElementById('btnSync');
    if(btn) {
        if(fila.length > 0) { btn.style.display = 'inline-block'; btn.innerText = `🔄 Sincronizar (${fila.length})`; }
        else { btn.style.display = 'none'; }
    }
}

async function sincronizar() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    if(fila.length === 0) return;
    
    if(!confirm(`Existem ${fila.length} ações pendentes. Sincronizar agora?`)) return;
    
    // Verifica se estamos realmente online antes de tentar
    try {
        await fetch(APIS.EVENTOS, { method: 'HEAD' }); 
    } catch(e) {
        alert("Ainda sem conexão com o servidor. Tente mais tarde.");
        return;
    }

    const tokenAdm = localStorage.getItem('token');
    const novaFila = [];
    let sucessos = 0;

    // Loop processando item a item
    for (const item of fila) {
        try {
            if (item.tipo === 'VISITANTE_OFFLINE') {
                // --- PROCESSAMENTO ESPECIAL PARA VISITANTES ---
                // Reutilizamos a lógica chamando a função original mas forçando o modo online
                // (Como o navegador agora tem internet, ele vai executar o bloco try da função acima)
                // Nota: Precisamos de uma pequena adaptação ou recriar a lógica aqui. 
                // Para simplificar, vou recriar a lógica "silenciosa" aqui:
                
                const { nome, email, eventoId } = item.corpo;
                const senha = "123456";

                // 1. Criar/Verificar Usuário
                await fetch(APIS.USUARIOS, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, senha })
                });

                // 2. Pegar Token do Visitante
                const resAuth = await fetch(APIS.AUTH, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });
                if(!resAuth.ok) throw new Error("Falha Auth Visitante Sync");
                
                const tokenVis = (await resAuth.json()).token;
                const idVis = lerIdDoToken(tokenVis);

                // 3. Inscrição e Check-in
                await fetch(APIS.INSCRICOES, {
                    method: 'POST', headers: { 'Authorization': 'Bearer ' + tokenVis, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuarioId: idVis, eventoId })
                });
                
                const resCheck = await fetch(APIS.PRESENCAS, {
                    method: 'POST', headers: { 'Authorization': 'Bearer ' + tokenVis, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuarioId: idVis, eventoId })
                });
                
                if(resCheck.ok) {
                    sucessos++;
                    // Envia e-mail silenciosamente
                    const nomeEvento = getNomeEventoPorId(eventoId);
                    enviarNotificacao(email, `Acesso Confirmado: ${nomeEvento}`, `Check-in realizado via plataforma.`);
                } else {
                    novaFila.push(item); // Falhou, mantém na fila
                }

            } else {
                // --- PROCESSAMENTO PADRÃO (Inscrição/Check-in normal) ---
                const res = await fetch(item.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenAdm },
                    body: JSON.stringify(item.corpo)
                });
                
                if(res.ok || res.status === 400 || res.status === 409) {
                    sucessos++;
                } else {
                    novaFila.push(item);
                }
            }
        } catch (e) {
            console.error("Erro ao sincronizar item:", item, e);
            novaFila.push(item); // Devolve para a fila se der erro
        }
    }
    
    localStorage.setItem('fila_sync', JSON.stringify(novaFila));
    alert(`Sincronização concluída!\nSucessos: ${sucessos}\nPendentes: ${novaFila.length}`);
    verificarPendencias();
    window.location.reload();
}

function sincronizarAutomatico() {
    const fila = JSON.parse(localStorage.getItem('fila_sync') || '[]');
    if(fila.length > 0) verificarPendencias();
}

// --- FUNÇÃO PARA MANTER COMPATIBILIDADE COM HTML ANTIGO ---
function verificarPermissaoStaff() {
    // Esta função foi integrada no renderizarTabela, mas mantemos aqui vazia
    // para que o HTML não dê erro "not defined" se for uma versão antiga.
    // Ela pode ser usada para forçar a verificação se necessário.
    const btn = document.getElementById('btnStaff');
    if(btn) {
        const emailRaw = localStorage.getItem('email');
        const emailLogado = emailRaw ? emailRaw.trim().toLowerCase() : "";
        const admins = ['admin@eventhub.com', 'staff@eventhub.com', 'josue@teste.com'];
        if(admins.includes(emailLogado)) btn.style.display = 'inline-block';
        else btn.style.display = 'none';
    }
}

// Login/Cadastro Form Listeners (Mantidos iguais)...
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const msg = document.getElementById('msg');
        try {
            const response = await fetch(APIS.AUTH, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            if (response.ok) {
                const data = await response.json();
                salvarSessao(data.token, email);
                localStorage.setItem('user_offline_' + email, senha);
                window.location.href = 'dashboard.html';
            } else { msg.innerText = "Credenciais inválidas"; }
        } catch (e) {
            if(localStorage.getItem('user_offline_' + email) === senha) {
                salvarSessao('TOKEN_OFFLINE', email);
                window.location.href = 'dashboard.html';
            } else { msg.innerText = "Erro ou login inválido"; }
        }
    });
}

const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        try {
            const res = await fetch(APIS.USUARIOS, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });
            if (res.ok) {
                alert("Cadastro OK! Faça login.");
                localStorage.setItem('user_offline_' + email, senha);
                window.location.href = 'index.html';
            } else alert("Erro ao cadastrar.");
        } catch (err) {
            localStorage.setItem('user_offline_' + email, senha);
            alert("Salvo offline! Pode logar.");
            window.location.href = 'index.html';
        }
    });
}
// --- ALTERAR SENHA ---
function alterarSenha() {
    document.getElementById('modalSenha').style.display = 'flex';
    document.getElementById('inputNovaSenha').value = '';
    document.getElementById('inputNovaSenha').focus();
}

function fecharModalSenha() {
    document.getElementById('modalSenha').style.display = 'none';
}

async function confirmarAlteracaoSenha() {
    const novaSenha = document.getElementById('inputNovaSenha').value;
    if (!novaSenha) { alert("Digite uma senha!"); return; }

    const usuarioId = localStorage.getItem('usuarioId');
    const token = localStorage.getItem('token');

    try {
        const resGet = await fetch(`${APIS.USUARIOS}/${usuarioId}`, {
            method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (resGet.ok) {
            const usuarioAtual = await resGet.json();
            usuarioAtual.senha = novaSenha;

            const resPut = await fetch(`${APIS.USUARIOS}/${usuarioId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(usuarioAtual)
            });

            if (resPut.ok) {
                alert("Senha alterada com sucesso!\nFaça login novamente.");
                logout();
            } else {
                alert("Erro ao alterar senha.");
            }
        }
    } catch (erro) {
        alert("Erro técnico: " + erro.message);
    }
    fecharModalSenha();
}

/**
 * Função Mestra para Admins
 * @param {number} eventoId - ID do evento
 * @param {string} tipoAcao - 'INSCRICAO', 'CHECKIN' ou 'TUDO'
 */
async function executarAcaoAdmin(eventoId, tipoAcao) {
    // Texto para o prompt ficar claro
    let textoAcao = "Ação Admin";
    if (tipoAcao === 'INSCRICAO') textoAcao = "Realizar APENAS Inscrição";
    if (tipoAcao === 'CHECKIN') textoAcao = "Realizar APENAS Check-in";
    if (tipoAcao === 'TUDO') textoAcao = "Cadastro Completo (Inscrição + Check-in)";

    console.log(`--- INICIANDO ${tipoAcao} ---`);
    
    const nomeInput = prompt(`${textoAcao}\n\nNome do Usuário:`); 
    if (!nomeInput) return;
    const email = prompt(`${textoAcao}\n\nE-mail do Usuário:`); 
    if (!email) return;

    const tokenAdmin = localStorage.getItem('token'); 
    
    try {
        if (!navigator.onLine) throw new Error("Offline");

        let usuarioId = null;
        let nomeReal = nomeInput;
        let isNovoUsuario = false; // <--- O SEGREDO PARA A SENHA

        // 1. TENTA CRIAR O USUÁRIO
        const senhaPadrao = "123456";
        const resCriar = await fetch(APIS.USUARIOS, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nomeInput, email, senha: senhaPadrao })
        });

        if (resCriar.ok) {
            console.log("Usuário NOVO criado.");
            isNovoUsuario = true; // Marcar que acabamos de criar
            try {
                const usuarioNovo = await resCriar.json();
                if(usuarioNovo && usuarioNovo.id) usuarioId = usuarioNovo.id;
            } catch(e) {}
        } else {
            console.log("Usuário já existe ou erro na criação. Buscando ID...");
        }

        // 2. BUSCAR ID SE NECESSÁRIO
        if (!usuarioId) {
            const resBusca = await fetch(APIS.USUARIOS, {
                headers: { 'Authorization': 'Bearer ' + tokenAdmin }
            });
            if (resBusca.ok) {
                const lista = await resBusca.json();
                const encontrado = lista.find(u => u.email.toLowerCase() === email.toLowerCase());
                if (encontrado) {
                    usuarioId = encontrado.id;
                    nomeReal = encontrado.nome;
                }
            }
        }

        if (!usuarioId) throw new Error("Não foi possível identificar o usuário (falha criar e buscar).");

        // 3. EXECUTAR AS AÇÕES COM BASE NO BOTÃO CLICADO
        let mensagensSucesso = [];

        // Ação: INSCRIÇÃO (Executa se for 'INSCRICAO' ou 'TUDO')
        if (tipoAcao === 'INSCRICAO' || tipoAcao === 'TUDO') {
            const resIns = await fetch(APIS.INSCRICOES, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenAdmin },
                body: JSON.stringify({ usuarioId, eventoId })
            });
            if (resIns.ok || resIns.status === 409) mensagensSucesso.push("Inscrição");
            else throw new Error("Falha na Inscrição");
        }

        // Ação: CHECK-IN (Executa se for 'CHECKIN' ou 'TUDO')
        if (tipoAcao === 'CHECKIN' || tipoAcao === 'TUDO') {
            const resPres = await fetch(APIS.PRESENCAS, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenAdmin },
                body: JSON.stringify({ usuarioId, eventoId })
            });
            if (resPres.ok || resPres.status === 409) mensagensSucesso.push("Check-in");
            else throw new Error("Falha no Check-in (verifique se o usuário estava inscrito)");
        }

        // 4. ENVIO DE E-MAIL E MENSAGEM FINAL
        const nomeEvento = getNomeEventoPorId(eventoId);
        
        // Dispara e-mail (Opcional: podes personalizar o texto baseado no tipoAcao também)
        enviarNotificacao(email, `Atualização: ${nomeEvento}`, `Olá ${nomeReal}! Ação realizada: ${mensagensSucesso.join(' e ')}.`);

        // --- MONTAGEM DA MENSAGEM FINAL PARA O ADMIN ---
        let msgFinal = `SUCESSO!\n\nUsuário: ${nomeReal}\nAções: ${mensagensSucesso.join(' + ')}`;

        if (isNovoUsuario) {
            // AQUI ESTÁ O QUE PEDISTE: MOSTRAR A SENHA
            msgFinal += `\n\nNOVO USUÁRIO CADASTRADO\nInforme ao visitante:\nLogin: ${email}\nSenha: ${senhaPadrao}`;
        } else {
            msgFinal += `\n\n(Usuário já existia na base de dados)`;
        }

        alert(msgFinal);
        window.location.reload();

    } catch (erro) {
        // TRATAMENTO OFFLINE IGUAL AO ANTERIOR
        console.warn("Erro:", erro);
        const msg = erro.message || "";

        if (msg === "Offline" || msg.includes("NetworkError") || msg.includes("Failed to fetch")) {
            salvarNaFila('VISITANTE_OFFLINE', 'SPECIAL', { 
                nome: nomeInput, email: email, eventoId: eventoId, tipoAcao: tipoAcao // Salvamos o tipo também!
            });
            alert(`Sem internet.\nA ação para "${nomeInput}" foi salva na fila.`);
            verificarPendencias();
        } else {
            alert(`Erro: ${msg.replace("Error:", "")}`);
        }
    }
}