    // 全局变量
    let currentPanel = null;
    let capturedRequests = [];
    let isListening = false;
    let originalFetch = null;
    let originalXMLHttpRequest = null;
    let originalWebSocket = null;
    let originalEventSource = null;
    let debugInfo = [];
    let performanceObserver = null;