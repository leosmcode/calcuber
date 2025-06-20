// DriveCalc - Calculadora Inteligente para Motoristas
// Versão 2.0 - Melhorada com melhor performance e acessibilidade

class DriveCalc {
    constructor() {
        this.db = null;
        this.charts = {};
        this.userData = {
            ganhosDia: 0,
            kmRodados: 0,
            gastoCombustivel: 0,
            tempoOnline: 0
        };
        this.currentSection = 'calculadora';
        this.isLoading = false;
        
        // Configurações
        this.config = {
            dbName: 'drivecalc_db',
            dbVersion: 1,
            defaultManutencao: 18,
            animationDuration: 300
        };

        this.init();
    }

    // Inicialização da aplicação
    async init() {
        try {
            this.showLoadingScreen();
            await this.initializeDatabase();
            this.bindEvents();
            this.checkFirstVisit();
            this.initializeCharts();
            this.updateDashboard();
            this.hideLoadingScreen();
            this.navigateToSection('calculadora');
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showToast('Erro ao inicializar a aplicação', 'error');
        }
    }

    // Tela de carregamento
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            // Simular progresso de carregamento
            setTimeout(() => {
                const progress = loadingScreen.querySelector('.loading-progress');
                if (progress) {
                    progress.style.width = '100%';
                }
            }, 500);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 1000);
        }
    }

    // Inicialização do banco de dados
    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('calculos')) {
                    const store = db.createObjectStore('calculos', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('data', 'data', { unique: false });
                    store.createIndex('veiculo', 'veiculo', { unique: false });
                }
                if (!db.objectStoreNames.contains('configuracoes')) {
                    db.createObjectStore('configuracoes', { keyPath: 'chave' });
                }
            };
        });
    }

    // Verificar primeira visita
    checkFirstVisit() {
        const userData = localStorage.getItem('drivecalc_user');
        if (!userData) {
            this.showWelcomeModal();
        } else {
            const { nome, carro } = JSON.parse(userData);
            this.updateUserInterface(nome, carro);
        }
    }

    // Modal de boas-vindas
    showWelcomeModal() {
        const modal = document.getElementById('welcome-modal');
        if (modal) {
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            // Focar no primeiro campo
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    hideWelcomeModal() {
        const modal = document.getElementById('welcome-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    // Salvar dados do usuário
    saveUserData(nome, carro) {
        const userData = {
            nome,
            carro,
            dataCadastro: new Date().toISOString()
        };
        localStorage.setItem('drivecalc_user', JSON.stringify(userData));
        this.showToast('Perfil salvo com sucesso!', 'success');
    }

    // Atualizar interface do usuário
    updateUserInterface(nome, carro) {
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            userGreeting.textContent = `Olá, ${nome}`;
        }

        // Atualizar selects de carro
        const carroSelects = ['carro', 'carro-inicial', 'user-car-setting'];
        carroSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const option = Array.from(select.options).find(opt => 
                    opt.text.includes(carro) || opt.text === carro
                );
                if (option) {
                    select.value = option.value;
                    if (selectId === 'carro') {
                        this.updateConsumption(option.value);
                    }
                }
            }
        });

        // Atualizar campo de nome nas configurações
        const userNameSetting = document.getElementById('user-name-setting');
        if (userNameSetting) {
            userNameSetting.value = nome;
        }
    }

    // Atualizar consumo quando carro é selecionado
    updateConsumption(kmL) {
        const kmLInput = document.getElementById('kmL');
        if (kmLInput && kmL) {
            kmLInput.value = kmL;
        }
    }

    // Validação de formulários
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            const errorElement = document.getElementById(field.getAttribute('aria-describedby'));
            
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                if (errorElement) {
                    errorElement.textContent = 'Este campo é obrigatório';
                }
            } else {
                field.classList.remove('error');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            }
        });

        return isValid;
    }

    // Calcular ganhos
    calculateEarnings(data) {
        const {
            ganhos,
            km,
            kmL,
            combustivel,
            manutencao = this.config.defaultManutencao,
            outrosGastos = 0,
            tempoOnline
        } = data;

        // Validações
        if (kmL <= 0) throw new Error('Consumo deve ser maior que zero');
        if (km < 0) throw new Error('Quilometragem não pode ser negativa');
        if (ganhos < 0) throw new Error('Ganhos não podem ser negativos');

        // Cálculos
        const litrosUsados = km / kmL;
        const gastoCombustivel = litrosUsados * combustivel;
        const gastoManutencao = (ganhos * manutencao) / 100;
        const ganhosLiquidos = ganhos - gastoCombustivel - gastoManutencao - outrosGastos;
        const ganhoPorHora = tempoOnline > 0 ? ganhosLiquidos / tempoOnline : 0;
        const ganhoPorKm = km > 0 ? ganhosLiquidos / km : 0;

        return {
            ganhosBrutos: ganhos,
            ganhosLiquidos,
            gastoCombustivel,
            gastoManutencao,
            outrosGastos,
            tempoOnline,
            ganhoPorHora,
            ganhoPorKm,
            litrosUsados,
            km,
            kmL,
            combustivel,
            manutencao
        };
    }

    // Salvar cálculo no banco
    async saveCalculation(resultados) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calculos'], 'readwrite');
            const store = transaction.objectStore('calculos');
            
            const calculo = {
                data: new Date().toISOString(),
                veiculo: this.getSelectedCarName(),
                ...resultados,
                timestamp: Date.now()
            };

            const request = store.add(calculo);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Obter nome do carro selecionado
    getSelectedCarName() {
        const carroSelect = document.getElementById('carro');
        if (carroSelect && carroSelect.selectedIndex > 0) {
            return carroSelect.options[carroSelect.selectedIndex].text;
        }
        return 'Não informado';
    }

    // Buscar cálculos por período
    async getCalculationsByPeriod(days = 7) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['calculos'], 'readonly');
            const store = transaction.objectStore('calculos');
            const index = store.index('data');
            
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const range = IDBKeyRange.lowerBound(startDate.toISOString());
            const request = index.getAll(range);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Mostrar resultados no modal
    showResults(resultados) {
        const modal = document.getElementById('resultado-modal');
        const resultadoContent = modal.querySelector('.resultado-content');
        
        resultadoContent.innerHTML = `
            <div class="resultado-item">
                <h4>Ganhos Brutos</h4>
                <p class="valor">${this.formatCurrency(resultados.ganhosBrutos)}</p>
            </div>
            <div class="resultado-item">
                <h4>Gastos com Combustível</h4>
                <p class="valor">${this.formatCurrency(resultados.gastoCombustivel)}</p>
                <small>${resultados.litrosUsados.toFixed(2)} litros utilizados</small>
            </div>
            <div class="resultado-item">
                <h4>Gastos com Manutenção (${resultados.manutencao}%)</h4>
                <p class="valor">${this.formatCurrency(resultados.gastoManutencao)}</p>
            </div>
            <div class="resultado-item">
                <h4>Outros Gastos</h4>
                <p class="valor">${this.formatCurrency(resultados.outrosGastos)}</p>
            </div>
            <div class="resultado-item">
                <h4>Tempo Online</h4>
                <p class="valor">${resultados.tempoOnline.toFixed(1)} horas</p>
            </div>
            <div class="resultado-item">
                <h4>Ganho por Hora</h4>
                <p class="valor ${resultados.ganhoPorHora >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(resultados.ganhoPorHora)}
                </p>
            </div>
            <div class="resultado-item">
                <h4>Ganho por Quilômetro</h4>
                <p class="valor ${resultados.ganhoPorKm >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(resultados.ganhoPorKm)}
                </p>
            </div>
            <div class="resultado-item total">
                <h4>Ganhos Líquidos</h4>
                <p class="valor ${resultados.ganhosLiquidos >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(resultados.ganhosLiquidos)}
                </p>
            </div>
        `;

        this.showModal(modal);

        // Salvar cálculo e atualizar estatísticas
        this.saveCalculation(resultados).then(() => {
            this.updateStatistics(resultados);
            this.updateHistory();
            this.updateCharts();
            this.showToast('Cálculo realizado com sucesso!', 'success');
        }).catch(error => {
            console.error('Erro ao salvar cálculo:', error);
            this.showToast('Erro ao salvar cálculo', 'error');
        });
    }

    // Atualizar estatísticas em tempo real
    updateStatistics(calculo) {
        const elements = {
            ganhos: document.getElementById('ganhos-dia'),
            quilometros: document.getElementById('km-dia'),
            combustivel: document.getElementById('combustivel-dia'),
            tempo: document.getElementById('tempo-dia')
        };

        if (elements.ganhos) {
            const currentGanhos = this.parseCurrency(elements.ganhos.textContent);
            const newGanhos = currentGanhos + calculo.ganhosBrutos;
            this.animateValue(elements.ganhos, currentGanhos, newGanhos, this.formatCurrency);
        }

        if (elements.quilometros) {
            const currentKm = parseFloat(elements.quilometros.textContent) || 0;
            const newKm = currentKm + calculo.km;
            this.animateValue(elements.quilometros, currentKm, newKm, (val) => `${val.toFixed(1)} km`);
        }

        if (elements.combustivel) {
            const currentCombustivel = this.parseCurrency(elements.combustivel.textContent);
            const newCombustivel = currentCombustivel + calculo.gastoCombustivel;
            this.animateValue(elements.combustivel, currentCombustivel, newCombustivel, this.formatCurrency);
        }

        if (elements.tempo) {
            const currentTime = this.parseTime(elements.tempo.textContent);
            const newTime = currentTime + (calculo.tempoOnline * 60);
            this.animateValue(elements.tempo, currentTime, newTime, this.formatTime);
        }
    }

    // Animar valores
    animateValue(element, start, end, formatter) {
        const duration = this.config.animationDuration;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * this.easeOutCubic(progress);
            element.textContent = formatter(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Função de easing
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Inicializar gráficos
    async initializeCharts() {
        try {
            await this.createEarningsChart();
            await this.createExpensesChart();
        } catch (error) {
            console.error('Erro ao inicializar gráficos:', error);
        }
    }

    // Criar gráfico de ganhos
    async createEarningsChart() {
        const ctx = document.getElementById('ganhosChart');
        if (!ctx) return;

        const calculos = await this.getCalculationsByPeriod(7);
        const data = this.processEarningsData(calculos);

        this.charts.ganhos = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Ganhos Líquidos (R$)',
                    data: data.values,
                    borderColor: '#28A745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#28A745',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#28A745',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => `Ganhos: ${this.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // Criar gráfico de gastos
    async createExpensesChart() {
        const ctx = document.getElementById('gastosChart');
        if (!ctx) return;

        const calculos = await this.getCalculationsByPeriod(30);
        const data = this.processExpensesData(calculos);

        this.charts.gastos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Combustível', 'Manutenção', 'Outros Gastos'],
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#FD7E14',
                        '#17A2B8',
                        '#FFC107'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = this.formatCurrency(context.parsed);
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Processar dados de ganhos
    processEarningsData(calculos) {
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last7Days.push(date);
        }

        const labels = last7Days.map(date => 
            date.toLocaleDateString('pt-BR', { weekday: 'short' })
        );

        const values = last7Days.map(date => {
            const dayCalculos = calculos.filter(calc => {
                const calcDate = new Date(calc.data);
                return calcDate.toDateString() === date.toDateString();
            });
            
            return dayCalculos.reduce((sum, calc) => sum + calc.ganhosLiquidos, 0);
        });

        return { labels, values };
    }

    // Processar dados de gastos
    processExpensesData(calculos) {
        const totals = calculos.reduce((acc, calc) => {
            acc.combustivel += calc.gastoCombustivel || 0;
            acc.manutencao += calc.gastoManutencao || 0;
            acc.outros += calc.outrosGastos || 0;
            return acc;
        }, { combustivel: 0, manutencao: 0, outros: 0 });

        return {
            values: [totals.combustivel, totals.manutencao, totals.outros]
        };
    }

    // Atualizar gráficos
    async updateCharts() {
        try {
            if (this.charts.ganhos) {
                const calculos = await this.getCalculationsByPeriod(7);
                const data = this.processEarningsData(calculos);
                this.charts.ganhos.data.labels = data.labels;
                this.charts.ganhos.data.datasets[0].data = data.values;
                this.charts.ganhos.update('active');
            }

            if (this.charts.gastos) {
                const calculos = await this.getCalculationsByPeriod(30);
                const data = this.processExpensesData(calculos);
                this.charts.gastos.data.datasets[0].data = data.values;
                this.charts.gastos.update('active');
            }
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
        }
    }

    // Atualizar histórico
    async updateHistory() {
        try {
            const calculos = await this.getCalculationsByPeriod(30);
            const historyList = document.getElementById('history-list');
            const noHistory = document.getElementById('no-history');

            if (!historyList || !noHistory) return;

            if (calculos.length === 0) {
                historyList.style.display = 'none';
                noHistory.style.display = 'block';
                return;
            }

            noHistory.style.display = 'none';
            historyList.style.display = 'block';

            // Ordenar por data (mais recente primeiro)
            calculos.sort((a, b) => new Date(b.data) - new Date(a.data));

            historyList.innerHTML = calculos.map(calc => `
                <div class="history-item">
                    <div class="history-header">
                        <h4>${new Date(calc.data).toLocaleDateString('pt-BR')}</h4>
                        <span class="history-vehicle">${calc.veiculo}</span>
                    </div>
                    <div class="history-details">
                        <div class="history-stat">
                            <span>Ganhos Brutos:</span>
                            <strong>${this.formatCurrency(calc.ganhosBrutos)}</strong>
                        </div>
                        <div class="history-stat">
                            <span>Ganhos Líquidos:</span>
                            <strong class="${calc.ganhosLiquidos >= 0 ? 'positive' : 'negative'}">
                                ${this.formatCurrency(calc.ganhosLiquidos)}
                            </strong>
                        </div>
                        <div class="history-stat">
                            <span>Quilômetros:</span>
                            <strong>${calc.km.toFixed(1)} km</strong>
                        </div>
                        <div class="history-stat">
                            <span>Tempo Online:</span>
                            <strong>${calc.tempoOnline.toFixed(1)}h</strong>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Erro ao atualizar histórico:', error);
        }
    }

    // Atualizar dashboard
    updateDashboard() {
        const elements = {
            ganhos: document.getElementById('ganhos-dia'),
            quilometros: document.getElementById('km-dia'),
            combustivel: document.getElementById('combustivel-dia'),
            tempo: document.getElementById('tempo-dia')
        };

        if (elements.ganhos) elements.ganhos.textContent = this.formatCurrency(this.userData.ganhosDia);
        if (elements.quilometros) elements.quilometros.textContent = `${this.userData.kmRodados.toFixed(1)} km`;
        if (elements.combustivel) elements.combustivel.textContent = this.formatCurrency(this.userData.gastoCombustivel);
        if (elements.tempo) elements.tempo.textContent = this.formatTime(this.userData.tempoOnline);
    }

    // Navegação entre seções
    navigateToSection(sectionId) {
        // Atualizar URL sem recarregar a página
        history.pushState({ section: sectionId }, '', `#${sectionId}`);
        
        // Esconder todas as seções
        const sections = document.querySelectorAll('main section');
        sections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Mostrar seção atual
        const currentSection = document.getElementById(sectionId);
        if (currentSection) {
            currentSection.style.display = 'block';
            setTimeout(() => currentSection.classList.add('active'), 10);
        }

        // Atualizar menu ativo
        const menuItems = document.querySelectorAll('.sidebar nav ul li');
        menuItems.forEach(item => {
            item.classList.remove('active');
            const link = item.querySelector('a');
            if (link && link.getAttribute('href') === `#${sectionId}`) {
                item.classList.add('active');
            }
        });

        // Atualizar título da página
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            const titles = {
                dashboard: 'Dashboard',
                calculadora: 'Calculadora',
                historico: 'Histórico',
                configuracoes: 'Configurações'
            };
            pageTitle.textContent = titles[sectionId] || 'DriveCalc';
        }

        this.currentSection = sectionId;
    }

    // Mostrar modal
    showModal(modal) {
        if (modal) {
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            
            // Focar no primeiro elemento focável
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }

    // Esconder modal
    hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    // Mostrar toast
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}" aria-hidden="true"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" aria-label="Fechar notificação">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;

        container.appendChild(toast);

        // Mostrar toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto-remover
        const autoRemove = setTimeout(() => this.removeToast(toast), duration);

        // Botão de fechar
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });
    }

    // Remover toast
    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Ícone do toast
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Compartilhar via WhatsApp
    shareWhatsApp() {
        const modal = document.getElementById('resultado-modal');
        const resultadoContent = modal.querySelector('.resultado-content');
        
        if (!resultadoContent) return;

        const data = new Date().toLocaleDateString('pt-BR');
        const carro = this.getSelectedCarName();
        const resultText = resultadoContent.innerText;
        
        const message = `*Relatório de Ganhos - ${data}*\n` +
            `*Veículo:* ${carro}\n\n` +
            resultText +
            `\n\n📱 Calculado com DriveCalc`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    }

    // Gerar PDF
    generatePDF() {
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                this.showToast('Biblioteca PDF não carregada', 'error');
                return;
            }

            const doc = new jsPDF('p', 'mm', 'a4');
            const data = new Date().toLocaleDateString('pt-BR');
            const carro = this.getSelectedCarName();
            
            // Cabeçalho
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text('Relatório de Ganhos', 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Data: ${data}`, 20, 35);
            doc.text(`Veículo: ${carro}`, 20, 42);
            
            // Linha separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 50, 190, 50);

            // Conteúdo do resultado
            const modal = document.getElementById('resultado-modal');
            const resultItems = modal.querySelectorAll('.resultado-item');
            
            let yPos = 65;
            resultItems.forEach(item => {
                const title = item.querySelector('h4').textContent;
                const value = item.querySelector('.valor').textContent;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
                doc.text(title + ':', 25, yPos);
                
                doc.setFont('helvetica', 'bold');
                doc.text(value, 120, yPos);
                
                yPos += 12;
            });

            // Rodapé
            const pageHeight = doc.internal.pageSize.height;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.text('DriveCalc - Relatório Gerado Automaticamente', 105, pageHeight - 15, { align: 'center' });

            // Salvar
            doc.save(`relatorio-ganhos-${data.replace(/\//g, '-')}.pdf`);
            this.showToast('PDF gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            this.showToast('Erro ao gerar PDF', 'error');
        }
    }

    // Limpar formulário
    clearForm() {
        const form = document.getElementById('quick-calc');
        if (form) {
            form.reset();
            
            // Limpar mensagens de erro
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(msg => msg.textContent = '');
            
            // Remover classes de erro
            const errorFields = form.querySelectorAll('.error');
            errorFields.forEach(field => field.classList.remove('error'));
            
            // Restaurar valor padrão de manutenção
            const manutencaoField = document.getElementById('manutencao');
            if (manutencaoField) {
                manutencaoField.value = this.config.defaultManutencao;
            }

            this.showToast('Formulário limpo', 'info');
        }
    }

    // Limpar histórico
    async clearHistory() {
        if (!confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const transaction = this.db.transaction(['calculos'], 'readwrite');
            const store = transaction.objectStore('calculos');
            await store.clear();
            
            this.updateHistory();
            this.updateCharts();
            this.showToast('Histórico limpo com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            this.showToast('Erro ao limpar histórico', 'error');
        }
    }

    // Resetar todos os dados
    async resetAllData() {
        const confirmation = prompt(
            'Esta ação irá apagar TODOS os seus dados permanentemente.\n' +
            'Digite "CONFIRMAR" para continuar:'
        );

        if (confirmation !== 'CONFIRMAR') {
            return;
        }

        try {
            // Limpar localStorage
            localStorage.removeItem('drivecalc_user');
            
            // Limpar IndexedDB
            const transaction = this.db.transaction(['calculos', 'configuracoes'], 'readwrite');
            await transaction.objectStore('calculos').clear();
            await transaction.objectStore('configuracoes').clear();
            
            // Resetar interface
            this.userData = {
                ganhosDia: 0,
                kmRodados: 0,
                gastoCombustivel: 0,
                tempoOnline: 0
            };
            
            this.updateDashboard();
            this.updateHistory();
            this.updateCharts();
            
            // Mostrar modal de boas-vindas
            setTimeout(() => this.showWelcomeModal(), 1000);
            
            this.showToast('Todos os dados foram resetados!', 'success');
        } catch (error) {
            console.error('Erro ao resetar dados:', error);
            this.showToast('Erro ao resetar dados', 'error');
        }
    }

    // Utilitários de formatação
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    parseCurrency(text) {
        return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    }

    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    }

    parseTime(text) {
        const matches = text.match(/(\d+)h\s*(\d+)m/);
        if (matches) {
            return parseInt(matches[1]) * 60 + parseInt(matches[2]);
        }
        return 0;
    }

    // Event listeners
    bindEvents() {
        // Formulário de boas-vindas
        const welcomeForm = document.getElementById('welcome-form');
        if (welcomeForm) {
            welcomeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.validateForm('welcome-form')) {
                    const nome = document.getElementById('motorista-nome').value;
                    const carroSelect = document.getElementById('carro-inicial');
                    const carro = carroSelect.options[carroSelect.selectedIndex].text;
                    
                    this.saveUserData(nome, carro);
                    this.updateUserInterface(nome, carro);
                    this.hideWelcomeModal();
                }
            });
        }

        // Formulário de cálculo
        const quickCalcForm = document.getElementById('quick-calc');
        if (quickCalcForm) {
            quickCalcForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.validateForm('quick-calc')) {
                    try {
                        const data = {
                            ganhos: parseFloat(document.getElementById('ganhos').value) || 0,
                            km: parseFloat(document.getElementById('km').value) || 0,
                            kmL: parseFloat(document.getElementById('kmL').value) || 0,
                            combustivel: parseFloat(document.getElementById('combustivel').value) || 0,
                            manutencao: parseFloat(document.getElementById('manutencao').value) || this.config.defaultManutencao,
                            outrosGastos: parseFloat(document.getElementById('outros-gastos').value) || 0,
                            tempoOnline: parseFloat(document.getElementById('tempo-online').value) || 0
                        };

                        const resultados = this.calculateEarnings(data);
                        this.showResults(resultados);
                    } catch (error) {
                        this.showToast(error.message, 'error');
                    }
                }
            });
        }

        // Seleção de carro
        const carroSelect = document.getElementById('carro');
        if (carroSelect) {
            carroSelect.addEventListener('change', (e) => {
                this.updateConsumption(e.target.value);
            });
        }

        // Navegação do menu
        const menuItems = document.querySelectorAll('.sidebar nav ul li a');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('href').substring(1);
                this.navigateToSection(targetId);
            });
        });

        // Menu mobile
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                const isOpen = sidebar.classList.contains('open');
                sidebar.classList.toggle('open');
                mobileToggle.setAttribute('aria-expanded', !isOpen);
            });
        }

        // Modais
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                this.hideModal(modal);
            });
        });

        // Fechar modal ao clicar fora
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });

        // Botões de ação
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => this.shareWhatsApp());
        }

        const pdfBtn = document.querySelector('.pdf-btn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => this.generatePDF());
        }

        const limparFormBtn = document.getElementById('limpar-form');
        if (limparFormBtn) {
            limparFormBtn.addEventListener('click', () => this.clearForm());
        }

        const limparHistoricoBtn = document.getElementById('limpar-historico');
        if (limparHistoricoBtn) {
            limparHistoricoBtn.addEventListener('click', () => this.clearHistory());
        }

        const resetDataBtn = document.getElementById('reset-data');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => this.resetAllData());
        }

        const exportBtn = document.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.generatePDF());
        }

        // Salvar perfil
        const saveProfileBtn = document.getElementById('save-profile');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                const nome = document.getElementById('user-name-setting').value;
                const carroSelect = document.getElementById('user-car-setting');
                const carro = carroSelect.options[carroSelect.selectedIndex].text;
                
                if (nome && carro) {
                    this.saveUserData(nome, carro);
                    this.updateUserInterface(nome, carro);
                } else {
                    this.showToast('Preencha todos os campos', 'warning');
                }
            });
        }

        // Navegação do histórico do navegador
        window.addEventListener('popstate', (e) => {
            const section = e.state?.section || 'calculadora';
            this.navigateToSection(section);
        });

        // Teclas de atalho
        document.addEventListener('keydown', (e) => {
            // ESC para fechar modais
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.hideModal(openModal);
                }
            }
        });

        // Validação em tempo real
        const inputs = document.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                const errorElement = document.getElementById(input.getAttribute('aria-describedby'));
                if (input.value.trim() === '') {
                    input.classList.add('error');
                    if (errorElement) {
                        errorElement.textContent = 'Este campo é obrigatório';
                    }
                } else {
                    input.classList.remove('error');
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }
            });
        });
    }
}

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.driveCalc = new DriveCalc();
});

