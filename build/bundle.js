
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.43.1 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let body;
    	let div0;
    	let h10;
    	let t1;
    	let div1;
    	let h11;
    	let t3;
    	let h12;
    	let t5;
    	let p0;
    	let t7;
    	let img0;
    	let img0_src_value;
    	let t8;
    	let t9;
    	let div2;
    	let p1;
    	let t11;
    	let div3;
    	let img1;
    	let img1_src_value;
    	let t12;
    	let h2;
    	let t14;
    	let p2;
    	let a;

    	const block = {
    		c: function create() {
    			body = element("body");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "NICE TO MEET YOU ARE YOU HAPPY TO GET TO KNOW ME";
    			t1 = space();
    			div1 = element("div");
    			h11 = element("h1");
    			h11.textContent = "MY PROFILE";
    			t3 = space();
    			h12 = element("h1");
    			h12.textContent = "NAME Phumrapee Petcharat";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "ผมชื่อ ภูมิรพี เพชรรัตน์ อายุ 16 ปี อยู่โรงเรียนไตรพัฒน์ สิ่งที่ผมชอบคือ\n\t\t\t\t\tการเขียนโปรเเกรมและเล่นเกมความฝันของผมคือการสร้างเกมเป็นของตัวเอง";
    			t7 = space();
    			img0 = element("img");
    			t8 = space();
    			t9 = text(".\n\t ");
    			div2 = element("div");
    			p1 = element("p");
    			p1.textContent = "สวัสดีครับ ผมจะเป็นคนพาคุณมารู้จักผมเอง อย่างแรกเลยผมเป็นคนที่ไม่ชอบเรื่องวุ่นวาย แต่ผมมักเจอแต่เรื่องวุ่นวายตลอด สิ่งที่ผมชอบคือการเขียนโปรแกรม เพราะมันน่าสนใจดี\n\t\t\t\t\t\t\t\tผลงานที่ผมได้ไป";
    			t11 = space();
    			div3 = element("div");
    			img1 = element("img");
    			t12 = space();
    			h2 = element("h2");
    			h2.textContent = "TRIPAT SCHOOL";
    			t14 = space();
    			p2 = element("p");
    			p2.textContent = "แนวคิดการศึกษาวอลดอร์ฟ คือ การช่วยให้มนุษย์บรรลุศักยภาพสูงสุดที่ตนมีและสามารถกำหนดความมุ่งหมาย\n\t\t\t\t\t\t\tและ แนวทางแก่ชีวิต ของตนได้อย่างอิสระตามกำลังความสามารถของตน แต่มนุษย์จะบรรลุศักยภาพสูงสุดของตนเองไม่ได้ ถ้าเขายังไม่มีโอกาส\n\t\t\t\t\t\t\tได้สัมผัสหรือค้นพบส่วนต่างๆหลายส่วนในตนเอง ด้วยเหตุนี้การศึกษาวอลดอร์ฟ จึงเน้นการศึกษาเรื่องมนุษย์และความเชื่อมโยงของมนุษย์กับโลกและ\n\t\t\t\t\t\t\tจักรวาลการเชื่อมโยงทุกเรื่องกับ มนุษย์ไม่ใช่";
    			a = element("a");
    			a.textContent = "...Read More";
    			set_style(h10, "font-size", "60px");
    			add_location(h10, file, 2, 1, 123);
    			set_style(div0, "background-color", "rgb(205, 214, 230)");
    			add_location(div0, file, 1, 3, 70);
    			add_location(h11, file, 5, 1, 273);
    			add_location(h12, file, 6, 1, 294);
    			set_style(p0, "font-size", "30px");
    			add_location(p0, file, 7, 4, 332);
    			if (!src_url_equal(img0.src, img0_src_value = "https://lh3.googleusercontent.com/-3GsHeMJe1hE/YVQR2WXmCjI/AAAAAAAAAT8/ootqj2gNY_MehIu97nDqkubYpvOoANSwQCEwYBhgLKtQDABHVOhz3yJ3D8MG6v493qe9p5msu8Wb8fljZF4xL3_MXXPZo2dPeCDYU_pFLu6D73tgoMPiAE6kbRfQt2QxF0jaBjv95vm7vFLw-pqFOilBNyUD2zj6c8fOr-QKlN-Rcuwvu1DsjNAI53OTpx71wkBg1A6SyKsccaZ8OegoiQC17mpiyE9M-KXK17noH-0WI9ez6NrsBW91Auv684yOG2vDuECHV2C-sWj2YGLRfkUAWLbusA34kuZ44xzbPB8iLdPLzW0LhRG3lZjvH1l4JFSTTW_gU0ZginY7PBgZrArQ2Zcu-mSQp0Cln7kRUI-t1D-ZqpSIeh9ecnczEQuhD6ZT1eWVmUmhsH-rSIKtjbbKCc9uiTuX2Q0xwNiQ6yfnn12wxhm7zircHblXWXsqgtUSXI-14UKpdO-g96isHObfvLH9cANYiZaYByk8qNHkaYvusnzR5jD0UHZoVGOZQOEUOmdpuD-unc3ggQZzzt9Wzpb5tB6Y0v8dr0PXuNVyMeOeWGHO-EwEn8EW7OJru2FACkkqNMN_GXin4MYNUiNsOgliUDIgR3aNBh5z35BB0GMd3sV7TVELFv4fT2OkONDPHaz1LihvF8Fa_ROOK1Mc0uIEqMLqo0IoG/w139-h140-p/messageImage_1626248813253.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "width", "30%");
    			add_location(img0, file, 9, 7, 514);
    			set_style(div1, "background-color", "cornsilk");
    			set_style(div1, "margin", "30px");
    			add_location(div1, file, 4, 2, 216);
    			set_style(p1, "font-size", "30px");
    			add_location(p1, file, 12, 5, 1406);
    			set_style(div2, "background", "rgb(231, 96, 96)");
    			set_style(div2, "padding", "20px");
    			add_location(div2, file, 11, 2, 1342);
    			if (!src_url_equal(img1.src, img1_src_value = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_0JFIXBXH75-_IHGicZfQFdQf_QekOHwlLyU40SErM7QzVLLMSWR3wYiqbQy4nSqX2Bk&usqp=CAU")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "width", "80%");
    			add_location(img1, file, 16, 6, 1699);
    			add_location(h2, file, 17, 4, 1861);
    			set_style(p2, "font-size", "30px");
    			add_location(p2, file, 18, 6, 1890);
    			attr_dev(a, "href", "http://www.tripatschool.ac.th/");
    			add_location(a, file, 22, 55, 2347);
    			set_style(div3, "background", "rgb(89, 173, 221)");
    			set_style(div3, "padding", "20px");
    			add_location(div3, file, 15, 1, 1633);
    			attr_dev(body, "align", "center");
    			set_style(body, "background-color", "rgb(179, 236, 243)");
    			add_location(body, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, body, anchor);
    			append_dev(body, div0);
    			append_dev(div0, h10);
    			append_dev(body, t1);
    			append_dev(body, div1);
    			append_dev(div1, h11);
    			append_dev(div1, t3);
    			append_dev(div1, h12);
    			append_dev(div1, t5);
    			append_dev(div1, p0);
    			append_dev(div1, t7);
    			append_dev(div1, img0);
    			append_dev(div1, t8);
    			append_dev(body, t9);
    			append_dev(body, div2);
    			append_dev(div2, p1);
    			append_dev(body, t11);
    			append_dev(body, div3);
    			append_dev(div3, img1);
    			append_dev(div3, t12);
    			append_dev(div3, h2);
    			append_dev(div3, t14);
    			append_dev(div3, p2);
    			append_dev(div3, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(body);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
