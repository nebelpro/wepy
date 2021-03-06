import event from './event';


const PREFIX = '$';
const JOIN = '$';

let prefixList = {};
let comCount = 0;


let $getPrefix = (prefix) => {
    return prefix;
    /*if (!prefix)
        return '';
    if (prefixList[prefix])
        return prefixList[prefix];
    prefixList[prefix] = `${PREFIX}${(comCount++)}${JOIN}`;
    return prefixList[prefix];*/
}

const pageEvent = ['onLoad', 'onReady', 'onShow', 'onHide', 'onUnload', 'onPullDownRefresh', 'onReachBottom'];


let $bindEvt = (config, com, prefix) => {
    com.prefix = $getPrefix(prefix);
    Object.getOwnPropertyNames(com.components || {}).forEach((name) => {
        let cClass = com.components[name];
        let child = new cClass();
        child.name = name.toLowerCase();
        let comPrefix = prefix ? (prefix + child.name + '$') : ('$' + child.name + '$');

        //prefixList[comPrefix] = comCount++;
        $getPrefix(comPrefix);
        
        com.$com[name] = child;

        $bindEvt(config, child, comPrefix);
    });
    Object.getOwnPropertyNames(com.constructor.prototype || []).forEach((prop) => {
        if(prop !== 'constructor' && pageEvent.indexOf(prop) === -1) {
            config[prop] = function () {
                com.constructor.prototype[prop].apply(com.$com[name], arguments);
                com.$apply();
            }
        }
    });
    Object.getOwnPropertyNames(com.methods || []).forEach((method, i) => {
        config[com.prefix + method] = function (e, ...args) {
            let evt = new event('system', this, e.type);
            evt.$transfor(e);
            args = [evt].concat(args);
            let wepyParams = !e.currentTarget ? null : (e.currentTarget.dataset ? e.currentTarget.dataset.wepyParams : '');
            if (wepyParams && wepyParams.length) {
                wepyParams = wepyParams.split('-');
                args = args.concat(wepyParams);
            }
            let rst = com.methods[method].apply(com, args);
            com.$apply();
            return rst;
        }
    });
    return config;
};



export default {
    init () {
        let noPromiseMethods = {
            stopRecord: true,
            pauseVoice: true,
            stopVoice: true,
            pauseBackgroundAudio: true,
            stopBackgroundAudio: true,
            showNavigationBarLoading: true,
            hideNavigationBarLoading: true,
            createAnimation: true,
            createContext: true,
            hideKeyboard: true,
            stopPullDownRefresh: true
        };
        Object.keys(wx).forEach((key) => {
            if (!noPromiseMethods[key] && key !== 'request' && key.substr(0, 2) !== 'on' && !(/\w+Sync$/.test(key))) {
                wx[key + '_bak'] = wx[key];
                Object.defineProperty(wx, key, {
                    get () {
                        return (obj) => {
                            obj = obj || {};
                            return new Promise((resolve, reject) => {
                                obj.success = resolve;
                                obj.fail = (res) => {
                                    if (res && res.errMsg) {
                                        reject(new Error(res.errMsg));
                                    } else {
                                        reject(res);
                                    }
                                }
                                wx[key + '_bak'](obj);
                            });
                        };
                    }
                });
            }
        });

    },
    $createApp (appClass) {
        let config = {};
        let app = new appClass();

        if (!this.instance) {
            app.init();
            this.instance = app;
        }
        Object.getOwnPropertyNames(app.constructor.prototype).forEach((name) => {
            if(name !== 'constructor')
                config[name] = app.constructor.prototype[name];
        });
        return config;
    },
    $createPage (pageClass) {
        let config = {}, k;
        let page = new pageClass();
        let self = this;

        config.onLoad = function (...args) {

            page.name = pageClass.name;
            page.init(this, self.instance, self.instance);
            page.onLoad && page.onLoad.apply(page, args);

            page.$apply();

            if (!page.$parent.$wxapp) {
                page.$parent.$wxapp = getApp();
            }
        }

        pageEvent.forEach((v) => {
            if (v !== 'onLoad') {
                config[v] = function (...args) {
                    page[v] && page[v].apply(page, args);
                    page.$apply();
                }
            }
        });

        return $bindEvt(config, page, '');
    },
}