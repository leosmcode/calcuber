document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const welcomeModal = document.getElementById('welcome-modal');
    const welcomeForm = document.getElementById('welcome-form');
    const userGreeting = document.getElementById('user-greeting');
    const carroSelect = document.getElementById('carro');
    const kmLInput = document.getElementById('kmL');
    const quickCalcForm = document.getElementById('quick-calc');
    const modal = document.getElementById('resultado-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const whatsappBtn = document.querySelector('.whatsapp-btn');
    const pdfBtn = document.querySelector('.pdf-btn');
    const menuItems = document.querySelectorAll('.sidebar nav ul li a');
    const notificationsBtn = document.querySelector('.notifications');
    const sections = document.querySelectorAll('main section');

    // Dados do usuário (simulados)
    let userData = {
        ganhosDia: 0,
        kmRodados: 0,
        gastoCombustivel: 0,
        tempoOnline: 0
    };

    // Banco de dados local
    const DB_NAME = 'drivecalc_db';
    const DB_VERSION = 1;
    let db;

    // Verificar se é primeira visita
    function verificarPrimeiraVisita() {
        const userData = localStorage.getItem('drivecalc_user');
        if (!userData) {
            welcomeModal.classList.add('show');
        } else {
            const { nome, carro } = JSON.parse(userData);
            atualizarInterface(nome, carro);
        }
    }

    // Salvar dados do usuário
    function salvarDadosUsuario(nome, carro) {
        const userData = {
            nome,
            carro,
            dataCadastro: new Date().toISOString()
        };
        localStorage.setItem('drivecalc_user', JSON.stringify(userData));
    }

    // Atualizar interface com dados do usuário
    function atualizarInterface(nome, carro) {
        userGreeting.textContent = `Olá, ${nome}`;
        
        // Encontrar e selecionar o carro no select
        const carroOption = Array.from(carroSelect.options).find(option => 
            option.text === carro
        );
        if (carroOption) {
            carroSelect.value = carroOption.value;
            carroSelect.disabled = true;
            kmLInput.value = carroOption.value;
        }
    }

    // Inicializar banco de dados
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('calculos')) {
                    const store = db.createObjectStore('calculos', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('data', 'data', { unique: false });
                }
            };
        });
    }

    // Salvar cálculo no banco de dados
    function salvarCalculo(resultados) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['calculos'], 'readwrite');
            const store = transaction.objectStore('calculos');
            
            const calculo = {
                data: new Date().toISOString(),
                carro: document.getElementById('carro').options[document.getElementById('carro').selectedIndex].text,
                ...resultados
            };

            const request = store.add(calculo);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Buscar cálculos da semana
    function buscarCalculosSemana() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['calculos'], 'readonly');
            const store = transaction.objectStore('calculos');
            const index = store.index('data');
            
            const umaSemanaAtras = new Date();
            umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
            
            const range = IDBKeyRange.lowerBound(umaSemanaAtras.toISOString());
            const request = index.getAll(range);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Atualizar extrato semanal
    function atualizarExtrato() {
        const extratoContent = document.querySelector('.extrato-content');
        if (!extratoContent) return;

        buscarCalculosSemana().then(calculos => {
            if (calculos.length === 0) {
                extratoContent.innerHTML = '<p class="no-data">Nenhum cálculo registrado na última semana</p>';
                return;
            }

            let html = `
                <table class="extrato-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Veículo</th>
                            <th>Ganhos Brutos</th>
                            <th>Ganhos Líquidos</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            calculos.forEach(calculo => {
                const data = new Date(calculo.data).toLocaleDateString('pt-BR');
                const ganhosLiquidos = calculo.ganhosLiquidos.toFixed(2);
                const classeGanhos = calculo.ganhosLiquidos >= 0 ? 'positive' : 'negative';

                html += `
                    <tr>
                        <td>${data}</td>
                        <td>${calculo.veiculo}</td>
                        <td>R$ ${calculo.ganhosBrutos.toFixed(2)}</td>
                        <td class="${classeGanhos}">R$ ${ganhosLiquidos}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            extratoContent.innerHTML = html;
        });
    }

    // Atualizar estatísticas em tempo real
    function atualizarEstatisticas(calculo) {
        const stats = {
            ganhos: document.querySelector('.stat-card:nth-child(1) .stat-value'),
            quilometros: document.querySelector('.stat-card:nth-child(2) .stat-value'),
            combustivel: document.querySelector('.stat-card:nth-child(3) .stat-value'),
            tempo: document.querySelector('.stat-card:nth-child(4) .stat-value')
        };

        // Atualizar ganhos
        const ganhosAtuais = parseFloat(stats.ganhos.textContent.replace('R$ ', '').replace(',', '.')) || 0;
        const novosGanhos = ganhosAtuais + calculo.ganhosBrutos;
        stats.ganhos.textContent = `R$ ${novosGanhos.toFixed(2)}`;

        // Atualizar quilômetros
        const kmAtuais = parseFloat(stats.quilometros.textContent) || 0;
        const novosKm = kmAtuais + calculo.km;
        stats.quilometros.textContent = `${novosKm.toFixed(1)} km`;

        // Atualizar combustível
        const combustivelAtual = parseFloat(stats.combustivel.textContent.replace('R$ ', '').replace(',', '.')) || 0;
        const gastoCombustivel = (calculo.km / calculo.kmL) * calculo.combustivel;
        const novoCombustivel = combustivelAtual + gastoCombustivel;
        stats.combustivel.textContent = `R$ ${novoCombustivel.toFixed(2)}`;

        // Atualizar tempo
        const tempoAtual = stats.tempo.textContent;
        const [horas, minutos] = tempoAtual.split('h ').map(n => parseInt(n) || 0);
        const tempoTotalMinutos = horas * 60 + minutos;
        const novoTempoTotal = tempoTotalMinutos + (calculo.tempoOnline * 60);
        const novasHoras = Math.floor(novoTempoTotal / 60);
        const novosMinutos = novoTempoTotal % 60;
        stats.tempo.textContent = `${novasHoras}h ${novosMinutos}m`;
    }

    // Função para formatar valores monetários
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    // Função para formatar quilômetros
    function formatarKm(valor) {
        return `${valor.toFixed(1)} km`;
    }

    // Função para formatar tempo
    function formatarTempo(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}h ${mins}m`;
    }

    // Função para calcular os ganhos
    function calcularGanhos(ganhos, km, combustivel, kmL, manutencao, outrosGastos) {
        // Cálculos
        const litrosUsados = km / kmL;
        const gastoCombustivel = litrosUsados * combustivel;
        const manutencaoValor = ganhos * (manutencao / 100);
        const ganhoLiquido = ganhos - gastoCombustivel - manutencaoValor - outrosGastos;

        return {
            ganhosBrutos: ganhos,
            gastoCombustivel,
            manutencao: manutencaoValor,
            outrosGastos,
            ganhoLiquido,
            litrosUsados
        };
    }

    // Função para atualizar o dashboard
    function atualizarDashboard() {
        // Atualizar cards de estatísticas
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = formatarMoeda(userData.ganhosDia);
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = formatarKm(userData.kmRodados);
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = formatarMoeda(userData.gastoCombustivel);
        document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = formatarTempo(userData.tempoOnline);
    }

    // Função para mostrar resultados no modal
    function mostrarResultados(resultados) {
        const modal = document.getElementById('resultado-modal');
        const resultadoContent = modal.querySelector('.resultado-content');
        
        resultadoContent.innerHTML = `
            <div class="resultado-item">
                <h4>Ganhos Brutos</h4>
                <p class="valor">R$ ${resultados.ganhosBrutos.toFixed(2)}</p>
            </div>
            <div class="resultado-item">
                <h4>Gastos com Combustível</h4>
                <p class="valor">R$ ${resultados.gastoCombustivel.toFixed(2)}</p>
            </div>
            <div class="resultado-item">
                <h4>Gastos com Manutenção</h4>
                <p class="valor">R$ ${resultados.gastoManutencao.toFixed(2)}</p>
            </div>
            <div class="resultado-item">
                <h4>Outros Gastos</h4>
                <p class="valor">R$ ${resultados.outrosGastos.toFixed(2)}</p>
            </div>
            <div class="resultado-item">
                <h4>Tempo Online</h4>
                <p class="valor">${resultados.tempoOnline.toFixed(1)} horas</p>
            </div>
            <div class="resultado-item">
                <h4>Ganho por Hora</h4>
                <p class="valor ${resultados.ganhoPorHora >= 0 ? 'positive' : 'negative'}">
                    R$ ${resultados.ganhoPorHora.toFixed(2)}
                </p>
            </div>
            <div class="resultado-item total">
                <h4>Ganhos Líquidos</h4>
                <p class="valor ${resultados.ganhosLiquidos >= 0 ? 'positive' : 'negative'}">
                    R$ ${resultados.ganhosLiquidos.toFixed(2)}
                </p>
            </div>
        `;

        modal.classList.add('show');

        // Salvar cálculo e atualizar estatísticas
        const calculo = {
            data: new Date(),
            veiculo: document.getElementById('carro').options[document.getElementById('carro').selectedIndex].text,
            ganhosBrutos: resultados.ganhosBrutos,
            ganhosLiquidos: resultados.ganhosLiquidos,
            km: parseFloat(document.getElementById('km').value) || 0,
            kmL: parseFloat(document.getElementById('kmL').value) || 0,
            combustivel: parseFloat(document.getElementById('combustivel').value) || 0,
            tempoOnline: resultados.tempoOnline,
            ganhoPorHora: resultados.ganhoPorHora
        };

        salvarCalculo(calculo).then(() => {
            atualizarEstatisticas(calculo);
            atualizarExtrato();
            atualizarGraficos();
        });
    }

    // Event Listeners
    if (carroSelect) {
        carroSelect.addEventListener('change', function() {
            const kmLInput = document.getElementById('kmL');
            if (kmLInput) {
                kmLInput.value = this.value;
            }
        });
    }

    if (quickCalcForm) {
        quickCalcForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Obter valores dos campos
            const ganhos = parseFloat(document.getElementById('ganhos').value) || 0;
            const km = parseFloat(document.getElementById('km').value) || 0;
            const kmL = parseFloat(document.getElementById('kmL').value) || 0;
            const combustivel = parseFloat(document.getElementById('combustivel').value) || 0;
            const manutencao = parseFloat(document.getElementById('manutencao').value) || 18;
            const outrosGastos = parseFloat(document.getElementById('outros-gastos').value) || 0;
            const tempoOnline = parseFloat(document.getElementById('tempo-online').value) || 0;

            // Calcular gastos
            const gastoCombustivel = (km / kmL) * combustivel;
            const gastoManutencao = (ganhos * manutencao) / 100;
            const ganhosLiquidos = ganhos - gastoCombustivel - gastoManutencao - outrosGastos;

            // Calcular ganho por hora
            const ganhoPorHora = tempoOnline > 0 ? ganhosLiquidos / tempoOnline : 0;

            // Mostrar resultados
            mostrarResultados({
                ganhosBrutos: ganhos,
                ganhosLiquidos: ganhosLiquidos,
                gastoCombustivel: gastoCombustivel,
                gastoManutencao: gastoManutencao,
                outrosGastos: outrosGastos,
                tempoOnline: tempoOnline,
                ganhoPorHora: ganhoPorHora
            });
        });
    }

    // Fechar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            modal.classList.remove('show');
        });
    }

    // Fechar modal ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // Compartilhar via WhatsApp
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            const data = new Date().toLocaleDateString('pt-BR');
            const carro = document.getElementById('carro').options[document.getElementById('carro').selectedIndex].text;
            const mensagem = `*Relatório de Ganhos - ${data}*\n` +
                `*Veículo:* ${carro}\n\n` +
                modal.querySelector('.resultado-content').innerText +
                `\n\nCalculado com DriveCalc`;

            const mensagemCodificada = encodeURIComponent(mensagem);
            window.open(`https://wa.me/?text=${mensagemCodificada}`, '_blank');
        });
    }

    // Download PDF
    if (pdfBtn) {
        pdfBtn.addEventListener('click', function() {
            const ganhos = parseFloat(document.getElementById('ganhos').value) || 0;
            const km = parseFloat(document.getElementById('km').value) || 0;
            const combustivel = parseFloat(document.getElementById('combustivel').value) || 0;
            const kmL = parseFloat(document.getElementById('kmL').value) || 0;
            const manutencao = parseFloat(document.getElementById('manutencao').value) || 18;
            const outrosGastos = parseFloat(document.getElementById('outros-gastos').value) || 0;

            const resultados = calcularGanhos(ganhos, km, combustivel, kmL, manutencao, outrosGastos);
            gerarPDF(resultados);
        });
    }

    // Navegação do menu
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            navegarPara(targetId);
        });
    });

    // Notificações
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', function() {
            // Aqui você pode implementar um sistema de notificações
            alert('Sistema de notificações em desenvolvimento!');
        });
    }

    // Inicializar gráficos
    function inicializarGraficos() {
        // Dados simulados para os últimos 7 dias
        const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const ganhos = [150, 180, 220, 190, 250, 300, 280];

        // Gráfico de ganhos
        const ganhosCtx = document.getElementById('ganhosChart').getContext('2d');
        new Chart(ganhosCtx, {
            type: 'line',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Ganhos (R$)',
                    data: ganhos,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        // Gráfico de gastos
        const gastosCtx = document.getElementById('gastosChart').getContext('2d');
        new Chart(gastosCtx, {
            type: 'doughnut',
            data: {
                labels: ['Combustível', 'Manutenção', 'Outros Gastos'],
                datasets: [{
                    data: [45, 35, 20],
                    backgroundColor: [
                        '#e74c3c',
                        '#3498db',
                        '#f1c40f'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Função para navegar entre as seções
    function navegarPara(secaoId) {
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        const secaoAtual = document.getElementById(secaoId);
        if (secaoAtual) {
            secaoAtual.style.display = 'block';
        }

        // Atualizar menu ativo
        menuItems.forEach(item => {
            item.parentElement.classList.remove('active');
            if (item.getAttribute('href') === `#${secaoId}`) {
                item.parentElement.classList.add('active');
            }
        });
    }

    // Event Listeners
    if (welcomeForm) {
        welcomeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nome = document.getElementById('motorista-nome').value;
            const carroSelect = document.getElementById('carro-inicial');
            const carro = carroSelect.options[carroSelect.selectedIndex].text;
            
            salvarDadosUsuario(nome, carro);
            atualizarInterface(nome, carro);
            
            welcomeModal.classList.remove('show');
        });
    }

    // Função para gerar PDF
    function gerarPDF(resultados) {
        const data = new Date().toLocaleDateString('pt-BR');
        const carro = document.getElementById('carro').options[document.getElementById('carro').selectedIndex].text;
        
        // Criar conteúdo do PDF
        const conteudo = `
            <html>
                <head>
                    <title>Relatório de Ganhos - ${data}</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .result-item { margin: 10px 0; }
                        .total { font-weight: bold; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Relatório de Ganhos</h1>
                        <p>Data: ${data}</p>
                        <p>Veículo: ${carro}</p>
                    </div>
                    <div class="content">
                        <div class="result-item">
                            <span>Ganhos Brutos:</span>
                            <span>${formatarMoeda(resultados.ganhosBrutos)}</span>
                        </div>
                        <div class="result-item">
                            <span>Gasto com Combustível:</span>
                            <span>${formatarMoeda(resultados.gastoCombustivel)}</span>
                        </div>
                        <div class="result-item">
                            <span>Manutenção (${document.getElementById('manutencao').value}%):</span>
                            <span>${formatarMoeda(resultados.manutencao)}</span>
                        </div>
                        <div class="result-item">
                            <span>Outros Gastos:</span>
                            <span>${formatarMoeda(resultados.outrosGastos)}</span>
                        </div>
                        <div class="result-item total">
                            <span>Ganho Líquido:</span>
                            <span>${formatarMoeda(resultados.ganhoLiquido)}</span>
                        </div>
                    </div>
                </body>
            </html>
        `;

        // Criar blob com o conteúdo
        const blob = new Blob([conteudo], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        
        // Criar link para download
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-ganhos-${data.replace(/\//g, '-')}.html`;
        
        // Simular clique para download
        document.body.appendChild(link);
        link.click();
        
        // Limpar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Função para exportar dashboard em PDF
    function exportarDashboardPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const dashboard = document.querySelector('.dashboard');
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR');

        // Configurações do PDF
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Relatório do Dashboard', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Data: ${dataAtual}`, 20, 30);
        doc.text(`Hora: ${horaAtual}`, 20, 37);

        // Adicionar estatísticas
        doc.setFontSize(14);
        doc.text('Estatísticas do Dia', 20, 50);
        
        const stats = document.querySelectorAll('.stat-card');
        let yPos = 60;
        
        stats.forEach((stat, index) => {
            const titulo = stat.querySelector('h3').textContent;
            const valor = stat.querySelector('.stat-value').textContent;
            const variacao = stat.querySelector('.stat-change').textContent;
            
            doc.setFontSize(12);
            doc.text(`${titulo}: ${valor}`, 25, yPos);
            doc.setFontSize(10);
            doc.text(variacao, 25, yPos + 7);
            
            yPos += 20;
        });

        // Adicionar gráficos
        const charts = document.querySelectorAll('.chart-card canvas');
        let chartYPos = 150;

        charts.forEach(async (canvas, index) => {
            try {
                const imgData = await html2canvas(canvas).then(canvas => canvas.toDataURL('image/png'));
                const imgWidth = 170;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                doc.addImage(imgData, 'PNG', 20, chartYPos, imgWidth, imgHeight);
                chartYPos += imgHeight + 20;
            } catch (error) {
                console.error('Erro ao converter gráfico:', error);
            }
        });

        // Adicionar rodapé
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(10);
        doc.text('DriveCalc - Relatório Gerado Automaticamente', 105, pageHeight - 10, { align: 'center' });

        // Salvar o PDF
        doc.save(`dashboard_${dataAtual.replace(/\//g, '-')}.pdf`);
    }

    // Adicionar botão de exportar no dashboard
    function adicionarBotaoExportar() {
        const dashboard = document.querySelector('.dashboard');
        const exportBtn = document.createElement('button');
        exportBtn.className = 'export-btn';
        exportBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar PDF';
        exportBtn.onclick = exportarDashboardPDF;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'dashboard-header';
        headerDiv.appendChild(exportBtn);
        
        dashboard.insertBefore(headerDiv, dashboard.firstChild);
    }

    // Inicializar
    verificarPrimeiraVisita();
    initDB().then(() => {
        inicializarGraficos();
        navegarPara('calculadora');
        atualizarDashboard();
        atualizarExtrato();
        adicionarBotaoExportar();
    }).catch(error => {
        console.error('Erro ao inicializar banco de dados:', error);
    });
}); 