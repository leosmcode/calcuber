// DriveCalc - Calculadora Inteligente para Motoristas
// Versão 2.1 - Melhorada com design moderno e performance otimizada

class DriveCalc {
    constructor() {
        this.db = null;
        this.charts = {};
        this.userData = {
            ganhosDia: 0,
            kmRodados: 0,
            gastoCombustivel: 0,
            tempoOnline: 0,
            nome: '',
            veiculoPadrao: ''
        };
        this.currentSection = 'dashboard';
        this.isLoading = false;
        this.calculations = [];
        this.tempCalculationData = null; // Armazenar dados temporários do cálculo
        
        // Configurações aprimoradas
        this.config = {
            dbName: 'drivecalc_db',
            dbVersion: 2,
            defaultManutencao: 18,
            animationDuration: 300,
            toastDuration: 4000,
            autoSave: true,
            notifications: true
        };

        // Cache para performance
        this.cache = {
            fuelPrices: new Map(),
            calculations: new Map()
        };

        this.init();
    }

    // Inicialização aprimorada da aplicação
    async init() {
        try {
            this.showLoadingScreen();
            await this.initializeDatabase();
            this.bindEvents();
            this.loadUserSettings();
            this.checkFirstVisit();
            this.initializeCharts();
            this.updateDashboard();
            this.updateCurrentDate();
            this.loadHistory();
            this.hideLoadingScreen();
            this.navigateToSection('dashboard');
            
            // Inicializar service worker (futuro)
            // this.initServiceWorker();
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showToast('Erro ao inicializar a aplicação. Recarregue a página.', 'error');
        }
    }

    // Tela de carregamento melhorada
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.setAttribute('aria-hidden', 'false');
            
            // Simular progresso de carregamento mais realista
            setTimeout(() => {
                const progress = loadingScreen.querySelector('.loading-progress');
                if (progress) {
                    progress.style.width = '30%';
                }
            }, 200);
            
            setTimeout(() => {
                const progress = loadingScreen.querySelector('.loading-progress');
                if (progress) {
                    progress.style.width = '70%';
                }
            }, 600);
            
            setTimeout(() => {
                const progress = loadingScreen.querySelector('.loading-progress');
                if (progress) {
                    progress.style.width = '100%';
                }
            }, 900);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                loadingScreen.setAttribute('aria-hidden', 'true');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 1200);
        }
    }

    // Atualizar data atual
    updateCurrentDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateElement.textContent = now.toLocaleDateString('pt-BR', options);
        }
    }

    // Inicialização do banco de dados aprimorada
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
                
                // Store para cálculos
                if (!db.objectStoreNames.contains('calculos')) {
                    const calculosStore = db.createObjectStore('calculos', { keyPath: 'id', autoIncrement: true });
                    calculosStore.createIndex('data', 'data', { unique: false });
                    calculosStore.createIndex('veiculo', 'veiculo', { unique: false });
                    calculosStore.createIndex('ganhoLiquido', 'ganhoLiquido', { unique: false });
                }
                
                // Store para configurações
                if (!db.objectStoreNames.contains('configuracoes')) {
                    db.createObjectStore('configuracoes', { keyPath: 'chave' });
                }
                
                // Store para dados do usuário
                if (!db.objectStoreNames.contains('usuario')) {
                    db.createObjectStore('usuario', { keyPath: 'id' });
                }
                
                // Store para cache de preços de combustível
                if (!db.objectStoreNames.contains('precos_combustivel')) {
                    const precosStore = db.createObjectStore('precos_combustivel', { keyPath: 'data' });
                    precosStore.createIndex('regiao', 'regiao', { unique: false });
                }
            };
        });
    }

    // Carregar configurações do usuário
    async loadUserSettings() {
        try {
            const settings = await this.getFromDB('configuracoes', 'user_settings');
            if (settings) {
                Object.assign(this.config, settings.value);
            }
            
            const userData = await this.getFromDB('usuario', 'profile');
            if (userData) {
                Object.assign(this.userData, userData);
                this.updateUserGreeting();
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    // Atualizar saudação do usuário
    updateUserGreeting() {
        const greetingElement = document.getElementById('user-greeting');
        if (greetingElement && this.userData.nome) {
            const hour = new Date().getHours();
            let greeting = 'Olá';
            
            if (hour < 12) greeting = 'Bom dia';
            else if (hour < 18) greeting = 'Boa tarde';
            else greeting = 'Boa noite';
            
            greetingElement.textContent = `${greeting}, ${this.userData.nome.split(' ')[0]}`;
        }
    }

    // Verificar primeira visita melhorada
    checkFirstVisit() {
        const userData = localStorage.getItem('drivecalc_user');
        if (!userData) {
            setTimeout(() => {
                this.showWelcomeModal();
            }, 1500);
        } else {
            try {
                const user = JSON.parse(userData);
                this.userData = { ...this.userData, ...user };
                this.updateUserGreeting();
            } catch (error) {
                console.error('Erro ao carregar dados do usuário:', error);
            }
        }
    }

    // Modal de boas-vindas melhorado
    showWelcomeModal() {
        const modal = document.getElementById('welcome-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            
            // Animação de entrada
            setTimeout(() => {
                modal.classList.add('show');
            }, 100);
            
            // Focar no primeiro input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 300);
            }
        }
    }

    hideWelcomeModal() {
        const modal = document.getElementById('welcome-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }, 300);
        }
    }

    // Bind de eventos aprimorado
    bindEvents() {
        // Formulário de boas-vindas
        const welcomeForm = document.getElementById('welcome-form');
        if (welcomeForm) {
            welcomeForm.addEventListener('submit', (e) => this.handleWelcomeSubmit(e));
        }

        // Navegação da sidebar
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Menu mobile
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Formulário da calculadora
        const calcForm = document.getElementById('quick-calc');
        if (calcForm) {
            calcForm.addEventListener('submit', (e) => this.handleCalculation(e));
        }

        // Seleção de carro
        const carSelect = document.getElementById('carro');
        if (carSelect) {
            carSelect.addEventListener('change', (e) => this.handleCarSelection(e));
        }

        // Botões de ação
        this.bindActionButtons();

        // Controles de gráfico
        this.bindChartControls();

        // Configurações
        this.bindSettingsEvents();

        // Eventos de teclado para acessibilidade
        this.bindKeyboardEvents();

        // Auto-save nos inputs
        this.bindAutoSave();
    }

    // Bind de botões de ação
    bindActionButtons() {
        const clearFormBtn = document.getElementById('clear-form');
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', () => this.clearForm());
        }

        const saveCalcBtn = document.getElementById('save-calc');
        if (saveCalcBtn) {
            saveCalcBtn.addEventListener('click', () => this.saveCalculation());
        }

        const exportBtn = document.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToPDF());
        }

        const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }
    }

    // Bind de controles de gráfico
    bindChartControls() {
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleChartPeriodChange(e));
        });
    }

    // Bind de eventos de configurações
    bindSettingsEvents() {
        // Toggle switches
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', (e) => this.handleToggle(e));
        });

        // Botões de configuração
        const exportDataBtn = document.getElementById('export-data');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportUserData());
        }

        const clearAllDataBtn = document.getElementById('clear-all-data');
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener('click', () => this.clearAllData());
        }
    }

    // Bind de eventos de teclado
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Esc para fechar modais
            if (e.key === 'Escape') {
                this.closeModals();
            }
            
            // Ctrl+S para salvar
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCalculation();
            }
            
            // Ctrl+Enter para calcular
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                const calcForm = document.getElementById('quick-calc');
                if (calcForm) {
                    calcForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    // Auto-save nos inputs
    bindAutoSave() {
        const inputs = document.querySelectorAll('#quick-calc input, #quick-calc select');
        inputs.forEach(input => {
            input.addEventListener('input', debounce(() => {
                if (this.config.autoSave) {
                    this.saveFormData();
                }
            }, 1000));
        });
    }

    // Navegação melhorada
    handleNavigation(e) {
        e.preventDefault();
        const target = e.currentTarget;
        const section = target.getAttribute('data-section') || target.getAttribute('href').substring(1);
        
        this.navigateToSection(section);
        
        // Fechar menu mobile se estiver aberto
        this.closeMobileMenu();
    }

    navigateToSection(sectionName) {
        // Atualizar seção atual
        this.currentSection = sectionName;
        
        // Ocultar todas as seções
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar seção atual
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Atualizar navegação ativa
        document.querySelectorAll('.sidebar nav li').forEach(li => {
            li.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNav) {
            activeNav.parentElement.classList.add('active');
        }
        
        // Atualizar título da página
        this.updatePageTitle(sectionName);
        
        // Carregar dados específicos da seção
        this.loadSectionData(sectionName);
    }

    // Atualizar título da página
    updatePageTitle(section) {
        const pageTitle = document.querySelector('.page-title');
        const titles = {
            dashboard: 'Dashboard',
            calculadora: 'Calculadora',
            historico: 'Histórico',
            relatorios: 'Relatórios',
            configuracoes: 'Configurações'
        };
        
        if (pageTitle) {
            pageTitle.textContent = titles[section] || 'DriveCalc';
        }
    }

    // Carregar dados específicos da seção
    loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                this.updateDashboard();
                this.updateCharts();
                break;
            case 'historico':
                this.loadHistory();
                break;
            case 'relatorios':
                this.loadReports();
                break;
            case 'configuracoes':
                this.loadSettings();
                break;
        }
    }

    // Menu mobile
    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.querySelector('.mobile-menu-toggle');
        
        if (sidebar && toggle) {
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                this.closeMobileMenu();
            } else {
                sidebar.classList.add('open');
                toggle.setAttribute('aria-expanded', 'true');
                
                // Adicionar overlay
                this.addMobileOverlay();
            }
        }
    }

    closeMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.querySelector('.mobile-menu-toggle');
        
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
        }
        
        this.removeMobileOverlay();
    }

    addMobileOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1040;
            backdrop-filter: blur(4px);
        `;
        
        overlay.addEventListener('click', () => this.closeMobileMenu());
        document.body.appendChild(overlay);
    }

    removeMobileOverlay() {
        const overlay = document.querySelector('.mobile-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Manipulação do formulário de boas-vindas
    async handleWelcomeSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const nome = formData.get('motorista-nome') || document.getElementById('motorista-nome').value;
        const carro = formData.get('carro-inicial') || document.getElementById('carro-inicial').value;
        const cidade = document.getElementById('cidade-inicial')?.value || '';
        
        // Validação
        if (!nome.trim()) {
            this.showFieldError('motorista-nome', 'Por favor, digite seu nome');
            return;
        }
        
        if (!carro) {
            this.showFieldError('carro-inicial', 'Por favor, selecione um veículo');
            return;
        }
        
        // Salvar dados do usuário
        this.userData.nome = nome.trim();
        this.userData.veiculoPadrao = carro;
        this.userData.cidade = cidade;
        
        try {
            await this.saveUserData();
            localStorage.setItem('drivecalc_user', JSON.stringify(this.userData));
            
            this.hideWelcomeModal();
            this.updateUserGreeting();
            this.showToast(`Bem-vindo, ${nome.split(' ')[0]}! Sua conta foi configurada com sucesso.`, 'success');
            
            // Pré-preencher formulário da calculadora
            this.prefillCalculatorForm();
            
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);
            this.showToast('Erro ao salvar seus dados. Tente novamente.', 'error');
        }
    }

    // Pré-preencher formulário da calculadora
    prefillCalculatorForm() {
        const carSelect = document.getElementById('carro');
        if (carSelect && this.userData.veiculoPadrao) {
            carSelect.value = this.userData.veiculoPadrao;
            carSelect.dispatchEvent(new Event('change'));
        }
    }

    // Manipulação da seleção de carro
    handleCarSelection(e) {
        const selectedValue = e.target.value;
        const kmlInput = document.getElementById('kmL');
        
        if (kmlInput && selectedValue) {
            kmlInput.value = selectedValue;
            
            // Animação visual
            kmlInput.style.background = 'linear-gradient(90deg, #dbeafe, #ffffff)';
            setTimeout(() => {
                kmlInput.style.background = '';
            }, 1000);
        }
    }

    // Manipulação do cálculo melhorada
    async handleCalculation(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showCalculationLoading();
        
        try {
            const formData = this.getFormData();
            
            // Validação
            const validation = this.validateCalculationForm(formData);
            if (!validation.isValid) {
                this.showValidationErrors(validation.errors);
                return;
            }
            
            // Realizar cálculo
            const results = this.calculateResults(formData);
            
            // Mostrar resultados
            this.displayResults(results);
            
            // Gerar insights
            const insights = this.generateInsights(results, formData);
            this.displayInsights(insights);
            
            // Mostrar botão de salvar (dados não são salvos automaticamente)
            this.showSaveButton();
            
            // Armazenar dados temporários para salvar depois
            this.tempCalculationData = { formData, results };
            
            // Analytics (futuro)
            this.trackCalculation(results);
            
        } catch (error) {
            console.error('Erro no cálculo:', error);
            this.showToast('Erro ao realizar o cálculo. Verifique os dados e tente novamente.', 'error');
        } finally {
            this.isLoading = false;
            this.hideCalculationLoading();
        }
    }

    // Obter dados do formulário
    getFormData() {
        return {
            carro: document.getElementById('carro').value,
            kmL: parseFloat(document.getElementById('kmL').value) || 0,
            ganhos: parseFloat(document.getElementById('ganhos').value) || 0,
            km: parseFloat(document.getElementById('km').value) || 0,
            precoCombustivel: parseFloat(document.getElementById('precoCombustivel').value) || 0,
            manutencao: parseFloat(document.getElementById('manutencao').value) || this.config.defaultManutencao
        };
    }

    // Validação do formulário
    validateCalculationForm(data) {
        const errors = [];
        
        if (!data.carro) {
            errors.push({ field: 'carro', message: 'Selecione um veículo' });
        }
        
        if (data.kmL <= 0) {
            errors.push({ field: 'kmL', message: 'Consumo deve ser maior que 0' });
        }
        
        if (data.ganhos <= 0) {
            errors.push({ field: 'ganhos', message: 'Ganhos devem ser maiores que 0' });
        }
        
        if (data.km <= 0) {
            errors.push({ field: 'km', message: 'Quilometragem deve ser maior que 0' });
        }
        
        if (data.precoCombustivel <= 0) {
            errors.push({ field: 'precoCombustivel', message: 'Preço do combustível deve ser maior que 0' });
        }
        
        if (data.manutencao < 0 || data.manutencao > 100) {
            errors.push({ field: 'manutencao', message: 'Manutenção deve estar entre 0% e 100%' });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Mostrar erros de validação
    showValidationErrors(errors) {
        // Limpar erros anteriores
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.remove('show');
            error.textContent = '';
        });
        
        document.querySelectorAll('.input-group').forEach(group => {
            group.classList.remove('error');
        });
        
        // Mostrar novos erros
        errors.forEach(error => {
            this.showFieldError(error.field, error.message);
        });
        
        // Focar no primeiro campo com erro
        if (errors.length > 0) {
            const firstErrorField = document.getElementById(errors[0].field);
            if (firstErrorField) {
                firstErrorField.focus();
            }
        }
    }

    // Mostrar erro em campo específico
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const inputGroup = field?.closest('.input-group');
        const errorElement = inputGroup?.querySelector('.error-message');
        
        if (inputGroup && errorElement) {
            inputGroup.classList.add('error');
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    // Realizar cálculos
    calculateResults(data) {
        const litrosConsumidos = data.km / data.kmL;
        const gastoCombustivel = litrosConsumidos * data.precoCombustivel;
        const gastoManutencao = (data.ganhos * data.manutencao) / 100;
        const gastoTotal = gastoCombustivel + gastoManutencao;
        const ganhoLiquido = data.ganhos - gastoTotal;
        const margemLucro = (ganhoLiquido / data.ganhos) * 100;
        const ganhoPorKm = ganhoLiquido / data.km;
        
        return {
            ganhoLiquido,
            gastoCombustivel,
            gastoManutencao,
            gastoTotal,
            margemLucro,
            ganhoPorKm,
            litrosConsumidos,
            eficiencia: this.calculateEfficiency(margemLucro, ganhoPorKm),
            timestamp: new Date().toISOString(),
            formData: data
        };
    }

    // Calcular eficiência
    calculateEfficiency(margemLucro, ganhoPorKm) {
        if (margemLucro >= 70 && ganhoPorKm >= 2) return 'Excelente';
        if (margemLucro >= 50 && ganhoPorKm >= 1.5) return 'Muito Bom';
        if (margemLucro >= 30 && ganhoPorKm >= 1) return 'Bom';
        if (margemLucro >= 15 && ganhoPorKm >= 0.5) return 'Regular';
        return 'Baixo';
    }

    // Exibir resultados
    displayResults(results) {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            
            // Animar entrada
            resultsSection.style.opacity = '0';
            resultsSection.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                resultsSection.style.transition = 'all 0.5s ease';
                resultsSection.style.opacity = '1';
                resultsSection.style.transform = 'translateY(0)';
            }, 100);
        }
        
        // Atualizar valores com animação
        this.animateValue('ganho-liquido', results.ganhoLiquido, 'currency');
        this.animateValue('gasto-combustivel', results.gastoCombustivel, 'currency');
        this.animateValue('gasto-manutencao', results.gastoManutencao, 'currency');
        this.animateValue('margem-lucro', results.margemLucro, 'percentage');
        this.animateValue('ganho-por-km', results.ganhoPorKm, 'currency');
        
        const eficienciaElement = document.getElementById('eficiencia-calc');
        if (eficienciaElement) {
            eficienciaElement.textContent = results.eficiencia;
            eficienciaElement.className = `result-value ${this.getEfficiencyClass(results.eficiencia)}`;
        }
    }

    // Animar valores
    animateValue(elementId, finalValue, type = 'number') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (finalValue - startValue) * easeOutQuart;
            
            switch (type) {
                case 'currency':
                    element.textContent = this.formatCurrency(currentValue);
                    break;
                case 'percentage':
                    element.textContent = `${currentValue.toFixed(1)}%`;
                    break;
                default:
                    element.textContent = currentValue.toFixed(2);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Obter classe de eficiência
    getEfficiencyClass(eficiencia) {
        switch (eficiencia) {
            case 'Excelente': return 'positive';
            case 'Muito Bom': return 'positive';
            case 'Bom': return 'neutral';
            case 'Regular': return 'warning';
            case 'Baixo': return 'negative';
            default: return 'neutral';
        }
    }

    // Gerar insights
    generateInsights(results, formData) {
        const insights = [];
        
        if (results.margemLucro < 30) {
            insights.push({
                type: 'warning',
                icon: 'fas fa-exclamation-triangle',
                title: 'Margem de lucro baixa',
                message: 'Sua margem de lucro está abaixo de 30%. Considere otimizar suas rotas ou revisar os preços.'
            });
        }
        
        if (results.ganhoPorKm < 1) {
            insights.push({
                type: 'info',
                icon: 'fas fa-route',
                title: 'Ganho por quilômetro',
                message: 'Tente focar em corridas mais longas ou em horários de maior demanda para aumentar o ganho por km.'
            });
        }
        
        if (formData.manutencao < 15) {
            insights.push({
                type: 'warning',
                icon: 'fas fa-tools',
                title: 'Reserve mais para manutenção',
                message: 'Recomendamos reservar pelo menos 15-20% dos ganhos para manutenção do veículo.'
            });
        }
        
        if (results.eficiencia === 'Excelente') {
            insights.push({
                type: 'success',
                icon: 'fas fa-trophy',
                title: 'Parabéns!',
                message: 'Você está com uma eficiência excelente! Continue assim para maximizar seus ganhos.'
            });
        }
        
        // Dica sobre combustível
        if (formData.precoCombustivel > 5.50) {
            insights.push({
                type: 'info',
                icon: 'fas fa-gas-pump',
                title: 'Preço do combustível alto',
                message: 'Considere pesquisar postos com preços mais baixos ou usar aplicativos de comparação.'
            });
        }
        
        return insights;
    }

    // Exibir insights
    displayInsights(insights) {
        const insightsContent = document.getElementById('insights-content');
        if (!insightsContent) return;
        
        if (insights.length === 0) {
            insightsContent.innerHTML = '<p>Nenhuma dica específica para este cálculo.</p>';
            return;
        }
        
        const insightsHTML = insights.map(insight => `
            <div class="insight-item" style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: var(--card-background); border-radius: var(--border-radius); border-left: 4px solid var(--${insight.type === 'success' ? 'success' : insight.type === 'warning' ? 'warning' : 'info'}-color);">
                <div style="color: var(--${insight.type === 'success' ? 'success' : insight.type === 'warning' ? 'warning' : 'info'}-color); font-size: 1.25rem;">
                    <i class="${insight.icon}"></i>
                </div>
                <div>
                    <h5 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${insight.title}</h5>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">${insight.message}</p>
                </div>
            </div>
        `).join('');
        
        insightsContent.innerHTML = insightsHTML;
    }

    // Mostrar loading do cálculo
    showCalculationLoading() {
        const submitBtn = document.querySelector('#quick-calc button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
        }
    }

    hideCalculationLoading() {
        const submitBtn = document.querySelector('#quick-calc button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-calculator"></i> Calcular Ganhos';
        }
    }

    // Mostrar botão de salvar
    showSaveButton() {
        const saveBtn = document.getElementById('save-calc');
        if (saveBtn) {
            saveBtn.style.display = 'inline-flex';
            saveBtn.style.animation = 'slideInRight 0.3s ease-out';
        }
    }

    // Salvar cálculo no histórico
    async saveCalculationToHistory(formData, results) {
        try {
            const calculation = {
                ...results,
                id: Date.now(),
                data: new Date().toISOString(),
                veiculo: this.getCarName(formData.carro),
                ...formData
            };
            
            await this.saveToDB('calculos', calculation);
            this.calculations.unshift(calculation);
            
            // Limitar histórico a 100 itens
            if (this.calculations.length > 100) {
                this.calculations = this.calculations.slice(0, 100);
            }
            
            return calculation;
        } catch (error) {
            console.error('Erro ao salvar cálculo:', error);
            throw error;
        }
    }

    // Obter nome do carro
    getCarName(value) {
        const carSelect = document.getElementById('carro');
        if (carSelect) {
            const option = carSelect.querySelector(`option[value="${value}"]`);
            return option ? option.textContent : 'Veículo não identificado';
        }
        return 'Veículo não identificado';
    }

    // Limpar formulário
    clearForm() {
        const form = document.getElementById('quick-calc');
        if (form) {
            form.reset();
            
            // Limpar erros
            document.querySelectorAll('.error-message').forEach(error => {
                error.classList.remove('show');
            });
            
            document.querySelectorAll('.input-group').forEach(group => {
                group.classList.remove('error');
            });
            
            // Ocultar resultados
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                resultsSection.style.display = 'none';
            }
            
            // Ocultar botão de salvar
            const saveBtn = document.getElementById('save-calc');
            if (saveBtn) {
                saveBtn.style.display = 'none';
            }
            
            // Limpar dados temporários
            this.tempCalculationData = null;
            
            this.showToast('Formulário limpo com sucesso', 'info');
        }
    }

    // Salvar cálculo manualmente
    async saveCalculation() {
        try {
            // Usar dados temporários se disponíveis, senão recalcular
            let formData, results;
            
            if (this.tempCalculationData) {
                formData = this.tempCalculationData.formData;
                results = this.tempCalculationData.results;
            } else {
                formData = this.getFormData();
                const validation = this.validateCalculationForm(formData);
                
                if (!validation.isValid) {
                    this.showToast('Corrija os erros no formulário antes de salvar', 'error');
                    return;
                }
                
                results = this.calculateResults(formData);
            }
            
            // Salvar no histórico
            await this.saveCalculationToHistory(formData, results);
            
            // Atualizar dados do dashboard
            this.userData.ganhosDia += results.ganhoLiquido;
            this.userData.kmRodados += formData.km;
            this.userData.gastoCombustivel += results.gastoCombustivel;
            
            // Salvar dados do usuário atualizados
            await this.saveUserData();
            
            // Atualizar dashboard
            this.updateDashboard();
            
            this.showToast('Cálculo salvo e adicionado ao dashboard com sucesso!', 'success');
            
            // Ocultar botão de salvar
            const saveBtn = document.getElementById('save-calc');
            if (saveBtn) {
                saveBtn.style.display = 'none';
            }
            
            // Limpar dados temporários
            this.tempCalculationData = null;
            
        } catch (error) {
            console.error('Erro ao salvar cálculo:', error);
            this.showToast('Erro ao salvar cálculo. Tente novamente.', 'error');
        }
    }

    // Carregar histórico
    async loadHistory() {
        try {
            const calculations = await this.getAllFromDB('calculos');
            this.calculations = calculations.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            this.displayHistory();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }

    // Exibir histórico
    displayHistory() {
        const historyContent = document.getElementById('history-content');
        if (!historyContent) return;
        
        if (this.calculations.length === 0) {
            historyContent.innerHTML = `
                <div class="history-card">
                    <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <h3>Nenhum cálculo encontrado</h3>
                        <p>Faça seu primeiro cálculo na seção Calculadora para ver o histórico aqui.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const historyHTML = this.calculations.map(calc => {
            const date = new Date(calc.data);
            const dateStr = date.toLocaleDateString('pt-BR');
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="history-card">
                    <div class="history-item">
                        <div class="history-info">
                            <div class="history-date">${dateStr} às ${timeStr}</div>
                            <div class="history-details">
                                ${calc.veiculo} • ${calc.km} km • ${this.formatCurrency(calc.ganhos)} brutos
                            </div>
                        </div>
                        <div class="history-value">${this.formatCurrency(calc.ganhoLiquido)}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <div style="text-align: center;">
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Combustível</div>
                            <div style="font-weight: 600;">${this.formatCurrency(calc.gastoCombustivel)}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Manutenção</div>
                            <div style="font-weight: 600;">${this.formatCurrency(calc.gastoManutencao)}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Margem</div>
                            <div style="font-weight: 600; color: ${calc.margemLucro >= 30 ? 'var(--success-color)' : calc.margemLucro >= 15 ? 'var(--warning-color)' : 'var(--danger-color)'};">${calc.margemLucro.toFixed(1)}%</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Eficiência</div>
                            <div style="font-weight: 600;">${calc.eficiencia}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        historyContent.innerHTML = historyHTML;
    }

    // Limpar histórico
    async clearHistory() {
        if (!confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            await this.clearStore('calculos');
            this.calculations = [];
            this.displayHistory();
            this.showToast('Histórico limpo com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            this.showToast('Erro ao limpar histórico. Tente novamente.', 'error');
        }
    }

    // Inicializar gráficos
    initializeCharts() {
        this.initGanhosChart();
        this.initGastosChart();
    }

    // Gráfico de ganhos
    initGanhosChart() {
        const ctx = document.getElementById('ganhosChart');
        if (!ctx) return;
        
        // Dados de exemplo (serão substituídos por dados reais)
        const data = {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Ganhos Líquidos',
                data: [120, 150, 180, 140, 200, 250, 180],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        };
        
        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: (context) => `R$ ${context.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            callback: (value) => `R$ ${value}`
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
        
        this.charts.ganhos = new Chart(ctx, config);
    }

    // Gráfico de gastos
    initGastosChart() {
        const ctx = document.getElementById('gastosChart');
        if (!ctx) return;
        
        const data = {
            labels: ['Combustível', 'Manutenção', 'Outros'],
            datasets: [{
                data: [60, 25, 15],
                backgroundColor: [
                    '#f59e0b',
                    '#8b5cf6',
                    '#6b7280'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        };
        
        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}%`
                        }
                    }
                },
                cutout: '60%'
            }
        };
        
        this.charts.gastos = new Chart(ctx, config);
    }

    // Atualizar gráficos
    updateCharts() {
        // Implementar atualização com dados reais
        this.updateGanhosChart();
        this.updateGastosChart();
    }

    updateGanhosChart() {
        if (!this.charts.ganhos) return;
        
        // Calcular dados dos últimos 7 dias baseado no histórico
        const last7Days = this.getLast7DaysData();
        
        this.charts.ganhos.data.labels = last7Days.labels;
        this.charts.ganhos.data.datasets[0].data = last7Days.values;
        this.charts.ganhos.update('active');
    }

    updateGastosChart() {
        if (!this.charts.gastos) return;
        
        // Calcular distribuição de gastos baseado no histórico
        const gastos = this.calculateExpenseDistribution();
        
        this.charts.gastos.data.datasets[0].data = [
            gastos.combustivel,
            gastos.manutencao,
            gastos.outros
        ];
        this.charts.gastos.update('active');
    }

    // Obter dados dos últimos 7 dias
    getLast7DaysData() {
        const labels = [];
        const values = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
            labels.push(dayName);
            
            // Calcular ganhos do dia baseado no histórico
            const dayCalculations = this.calculations.filter(calc => {
                const calcDate = new Date(calc.data);
                return calcDate.toDateString() === date.toDateString();
            });
            
            const dayTotal = dayCalculations.reduce((sum, calc) => sum + calc.ganhoLiquido, 0);
            values.push(dayTotal);
        }
        
        return { labels, values };
    }

    // Calcular distribuição de gastos
    calculateExpenseDistribution() {
        if (this.calculations.length === 0) {
            return { combustivel: 60, manutencao: 25, outros: 15 };
        }
        
        const totalCombustivel = this.calculations.reduce((sum, calc) => sum + calc.gastoCombustivel, 0);
        const totalManutencao = this.calculations.reduce((sum, calc) => sum + calc.gastoManutencao, 0);
        const totalGastos = totalCombustivel + totalManutencao;
        
        if (totalGastos === 0) {
            return { combustivel: 60, manutencao: 25, outros: 15 };
        }
        
        const combustivelPercent = (totalCombustivel / totalGastos) * 85; // 85% para combustível e manutenção
        const manutencaoPercent = (totalManutencao / totalGastos) * 85;
        const outrosPercent = 15; // 15% para outros gastos
        
        return {
            combustivel: Math.round(combustivelPercent),
            manutencao: Math.round(manutencaoPercent),
            outros: outrosPercent
        };
    }

    // Manipular mudança de período do gráfico
    handleChartPeriodChange(e) {
        const button = e.target;
        const period = button.getAttribute('data-period');
        
        // Atualizar botões ativos
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.setAttribute('aria-pressed', 'false');
        });
        button.setAttribute('aria-pressed', 'true');
        
        // Atualizar gráfico baseado no período
        this.updateChartPeriod(period);
    }

    updateChartPeriod(period) {
        // Implementar atualização do gráfico baseado no período
        console.log(`Atualizando gráfico para período: ${period} dias`);
    }

    // Atualizar dashboard
    updateDashboard() {
        this.updateDashboardStats();
        this.updateWeeklySummary();
    }

    updateDashboardStats() {
        const today = new Date();
        const todayCalculations = this.calculations.filter(calc => {
            const calcDate = new Date(calc.data);
            return calcDate.toDateString() === today.toDateString();
        });
        
        const todayStats = todayCalculations.reduce((stats, calc) => {
            stats.ganhos += calc.ganhoLiquido;
            stats.km += calc.km;
            stats.combustivel += calc.gastoCombustivel;
            return stats;
        }, { ganhos: 0, km: 0, combustivel: 0 });
        
        // Atualizar elementos do dashboard
        this.updateElement('ganhos-dia', this.formatCurrency(todayStats.ganhos));
        this.updateElement('km-dia', `${todayStats.km.toFixed(1)} km`);
        this.updateElement('combustivel-dia', this.formatCurrency(todayStats.combustivel));
        
        // Calcular tempo online (simulado)
        const horasOnline = todayCalculations.length * 0.5; // Estimativa
        const horas = Math.floor(horasOnline);
        const minutos = Math.round((horasOnline - horas) * 60);
        this.updateElement('tempo-dia', `${horas}h ${minutos}m`);
    }

    updateWeeklySummary() {
        const weekCalculations = this.getWeekCalculations();
        
        if (weekCalculations.length === 0) {
            this.updateElement('media-dia', 'R$ 0,00');
            this.updateElement('melhor-dia', 'R$ 0,00');
            this.updateElement('total-semana', 'R$ 0,00');
            this.updateElement('eficiencia', '0%');
            return;
        }
        
        const totalSemana = weekCalculations.reduce((sum, calc) => sum + calc.ganhoLiquido, 0);
        const mediaDia = totalSemana / 7;
        const melhorDia = Math.max(...weekCalculations.map(calc => calc.ganhoLiquido));
        const eficienciaMedia = weekCalculations.reduce((sum, calc) => sum + calc.margemLucro, 0) / weekCalculations.length;
        
        this.updateElement('media-dia', this.formatCurrency(mediaDia));
        this.updateElement('melhor-dia', this.formatCurrency(melhorDia));
        this.updateElement('total-semana', this.formatCurrency(totalSemana));
        this.updateElement('eficiencia', `${eficienciaMedia.toFixed(1)}%`);
    }

    getWeekCalculations() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Domingo
        
        return this.calculations.filter(calc => {
            const calcDate = new Date(calc.data);
            return calcDate >= weekStart && calcDate <= today;
        });
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Carregar relatórios
    loadReports() {
        this.updateMonthlyReport();
        this.updateComparative();
    }

    updateMonthlyReport() {
        const monthCalculations = this.getMonthCalculations();
        
        const totalMes = monthCalculations.reduce((sum, calc) => sum + calc.ganhoLiquido, 0);
        const diasTrabalhados = new Set(monthCalculations.map(calc => 
            new Date(calc.data).toDateString()
        )).size;
        const mediaDiaria = diasTrabalhados > 0 ? totalMes / diasTrabalhados : 0;
        
        this.updateElement('total-mes', this.formatCurrency(totalMes));
        this.updateElement('media-diaria', this.formatCurrency(mediaDiaria));
        this.updateElement('dias-trabalhados', diasTrabalhados.toString());
    }

    updateComparative() {
        const thisMonth = this.getMonthCalculations();
        const lastMonth = this.getLastMonthCalculations();
        
        const thisMonthTotal = thisMonth.reduce((sum, calc) => sum + calc.ganhoLiquido, 0);
        const lastMonthTotal = lastMonth.reduce((sum, calc) => sum + calc.ganhoLiquido, 0);
        
        const crescimento = lastMonthTotal > 0 ? 
            ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
        
        this.updateElement('crescimento', `${crescimento >= 0 ? '+' : ''}${crescimento.toFixed(1)}%`);
        
        const eficiencia = crescimento > 5 ? 'Crescendo' : 
                          crescimento < -5 ? 'Declinando' : 'Estável';
        this.updateElement('eficiencia-comparativo', eficiencia);
    }

    getMonthCalculations() {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        return this.calculations.filter(calc => {
            const calcDate = new Date(calc.data);
            return calcDate >= monthStart && calcDate <= today;
        });
    }

    getLastMonthCalculations() {
        const today = new Date();
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        
        return this.calculations.filter(calc => {
            const calcDate = new Date(calc.data);
            return calcDate >= lastMonthStart && calcDate <= lastMonthEnd;
        });
    }

    // Carregar configurações
    loadSettings() {
        // Carregar configurações do usuário
        const userNameSetting = document.getElementById('user-name-setting');
        if (userNameSetting) {
            userNameSetting.value = this.userData.nome || '';
        }
        
        const defaultCarSetting = document.getElementById('default-car-setting');
        if (defaultCarSetting) {
            // Preencher opções de carros
            this.populateCarOptions(defaultCarSetting);
            defaultCarSetting.value = this.userData.veiculoPadrao || '';
        }
        
        // Atualizar toggles
        this.updateToggle('notifications-toggle', this.config.notifications);
        this.updateToggle('auto-save-toggle', this.config.autoSave);
        this.updateToggle('dark-mode-toggle', false); // Modo escuro ainda não implementado
    }

    populateCarOptions(selectElement) {
        const carSelect = document.getElementById('carro');
        if (carSelect && selectElement) {
            selectElement.innerHTML = carSelect.innerHTML;
        }
    }

    updateToggle(toggleId, isActive) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            if (isActive) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    }

    // Manipular toggles
    handleToggle(e) {
        const toggle = e.currentTarget;
        const isActive = toggle.classList.contains('active');
        
        if (isActive) {
            toggle.classList.remove('active');
        } else {
            toggle.classList.add('active');
        }
        
        // Atualizar configuração baseada no ID
        const toggleId = toggle.id;
        switch (toggleId) {
            case 'notifications-toggle':
                this.config.notifications = !isActive;
                break;
            case 'auto-save-toggle':
                this.config.autoSave = !isActive;
                break;
            case 'dark-mode-toggle':
                // Implementar modo escuro no futuro
                this.showToast('Modo escuro será implementado em breve', 'info');
                toggle.classList.remove('active'); // Remover até implementar
                break;
        }
        
        // Salvar configurações
        this.saveSettings();
    }

    // Salvar configurações
    async saveSettings() {
        try {
            await this.saveToDB('configuracoes', {
                chave: 'user_settings',
                value: this.config
            });
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
        }
    }

    // Exportar dados do usuário
    async exportUserData() {
        try {
            const data = {
                usuario: this.userData,
                configuracoes: this.config,
                calculos: this.calculations,
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `drivecalc-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            this.showToast('Erro ao exportar dados. Tente novamente.', 'error');
        }
    }

    // Limpar todos os dados
    async clearAllData() {
        const confirmation = prompt(
            'Esta ação irá apagar TODOS os seus dados permanentemente.\n\n' +
            'Digite "CONFIRMAR" para continuar:'
        );
        
        if (confirmation !== 'CONFIRMAR') {
            return;
        }
        
        try {
            // Limpar IndexedDB
            await this.clearStore('calculos');
            await this.clearStore('configuracoes');
            await this.clearStore('usuario');
            
            // Limpar localStorage
            localStorage.removeItem('drivecalc_user');
            
            // Resetar dados em memória
            this.calculations = [];
            this.userData = {
                ganhosDia: 0,
                kmRodados: 0,
                gastoCombustivel: 0,
                tempoOnline: 0,
                nome: '',
                veiculoPadrao: ''
            };
            
            // Recarregar página
            this.showToast('Todos os dados foram removidos. Recarregando...', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
            this.showToast('Erro ao limpar dados. Tente novamente.', 'error');
        }
    }

    // Exportar para PDF
    async exportToPDF() {
        try {
            this.showToast('Gerando PDF...', 'info');
            
            // Implementar exportação para PDF
            // Por enquanto, mostrar mensagem
            this.showToast('Funcionalidade de PDF será implementada em breve', 'info');
            
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            this.showToast('Erro ao gerar PDF. Tente novamente.', 'error');
        }
    }

    // Sistema de toast melhorado
    showToast(message, type = 'info', duration = null) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${icons[type] || icons.info}"></i>
                </div>
                <div class="toast-message">${message}</div>
                <button class="toast-close" aria-label="Fechar notificação">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Adicionar evento de fechar
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));
        
        toastContainer.appendChild(toast);
        
        // Mostrar toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto-remover
        const toastDuration = duration || this.config.toastDuration;
        setTimeout(() => {
            this.removeToast(toast);
        }, toastDuration);
    }

    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Fechar modais
    closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.getAttribute('aria-hidden') === 'false') {
                modal.setAttribute('aria-hidden', 'true');
                modal.style.display = 'none';
            }
        });
    }

    // Salvar dados do formulário
    saveFormData() {
        const formData = this.getFormData();
        localStorage.setItem('drivecalc_form_data', JSON.stringify(formData));
    }

    // Carregar dados do formulário
    loadFormData() {
        try {
            const savedData = localStorage.getItem('drivecalc_form_data');
            if (savedData) {
                const formData = JSON.parse(savedData);
                
                Object.keys(formData).forEach(key => {
                    const element = document.getElementById(key);
                    if (element && formData[key]) {
                        element.value = formData[key];
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao carregar dados do formulário:', error);
        }
    }

    // Salvar dados do usuário
    async saveUserData() {
        try {
            await this.saveToDB('usuario', {
                id: 'profile',
                ...this.userData
            });
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);
            throw error;
        }
    }

    // Métodos de banco de dados
    async saveToDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getFromDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromDB(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Utilitários
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    trackCalculation(results) {
        // Implementar analytics no futuro
        console.log('Cálculo realizado:', results);
    }
}

// Função debounce para otimização
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.driveCalc = new DriveCalc();
});

// Registrar service worker (futuro)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js');
    });
}

