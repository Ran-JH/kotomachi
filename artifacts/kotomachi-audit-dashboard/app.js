(function () {
  "use strict";

  var data = window.KOTOMACHI_AUDIT_DATA;
  var pageLabels = {
    "overview": "Overview",
    "findings": "Findings",
    "system-map": "System Map",
    "journeys": "User Journeys",
    "eval-data": "Eval & Data",
    "engineering": "Engineering",
    "roadmap": "Roadmap",
    "flagship": "Flagship Case",
    "full-report": "Full Report"
  };
  var severityOrder = { "Critical": 0, "High": 1, "Medium": 2, "Low": 3 };
  var toastTimer = null;
  var activePage = "overview";

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function appendChild(parent, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(function (item) { appendChild(parent, item); });
      return;
    }
    if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }

  function make(tag, attributes) {
    var node = document.createElement(tag);
    var attrs = attributes || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "hidden") node.hidden = Boolean(value);
      else if (key === "open") node.open = Boolean(value);
      else if (key === "dataset") {
        Object.keys(value).forEach(function (dataKey) { node.dataset[dataKey] = value[dataKey]; });
      } else if (key.indexOf("on") === 0 && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value !== null && value !== undefined) {
        node.setAttribute(key, String(value));
      }
    });
    for (var i = 2; i < arguments.length; i += 1) appendChild(node, arguments[i]);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function plainMarkdown(text) {
    return String(text || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\(<([^>]+)>\)/g, "$1 $2")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2")
      .replace(/[*_~#>]/g, "")
      .replace(/\x60/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function nextInlineToken(source, offset) {
    var rest = source.slice(offset);
    var patterns = [
      { type: "local-link", regex: /\[([^\]]+)\]\(<([^>]+)>\)/ },
      { type: "link", regex: /\[([^\]]+)\]\(([^)]+)\)/ },
      { type: "strong", regex: /\*\*(.+?)\*\*/ },
      { type: "code", regex: /\x60([^\x60]+)\x60/ }
    ];
    var best = null;
    patterns.forEach(function (pattern) {
      var match = pattern.regex.exec(rest);
      if (match && (!best || match.index < best.match.index)) best = { type: pattern.type, match: match };
    });
    return best;
  }

  function appendInline(parent, source) {
    var text = String(source || "");
    var offset = 0;
    while (offset < text.length) {
      var token = nextInlineToken(text, offset);
      if (!token) {
        parent.appendChild(document.createTextNode(text.slice(offset)));
        break;
      }
      if (token.match.index > 0) parent.appendChild(document.createTextNode(text.slice(offset, offset + token.match.index)));
      if (token.type === "strong") {
        parent.appendChild(make("strong", { text: token.match[1] }));
      } else if (token.type === "code") {
        parent.appendChild(make("code", { text: token.match[1] }));
      } else if (token.type === "local-link") {
        parent.appendChild(make("span", { className: "file-ref" },
          document.createTextNode(token.match[1]),
          make("code", { text: token.match[2] })
        ));
      } else {
        var href = token.match[2];
        if (/^https?:\/\//i.test(href)) {
          parent.appendChild(make("a", { href: href, target: "_blank", rel: "noreferrer", text: token.match[1] }));
        } else {
          parent.appendChild(make("span", { className: "file-ref" },
            document.createTextNode(token.match[1]),
            make("code", { text: href })
          ));
        }
      }
      offset += token.match.index + token.match[0].length;
    }
  }

  function tableCells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (cell) { return cell.trim(); });
  }

  function structural(line, next) {
    if (!line.trim() || /^#{1,6}\s/.test(line) || /^\x60\x60\x60/.test(line)) return true;
    if (/^>\s?/.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) return true;
    return /^\|/.test(line) && next && /^\|?\s*:?-{3}/.test(next);
  }

  function renderMarkdown(markdown, options) {
    var container = make("div", { className: "markdown-body" });
    var lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    var settings = options || {};
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i += 1; continue; }

      var fence = line.match(/^\x60\x60\x60(.*)$/);
      if (fence) {
        var language = fence[1].trim();
        var codeLines = [];
        i += 1;
        while (i < lines.length && !/^\x60\x60\x60/.test(lines[i])) { codeLines.push(lines[i]); i += 1; }
        if (i < lines.length) i += 1;
        var code = make("code", { text: codeLines.join("\n") });
        if (language) code.dataset.language = language;
        container.appendChild(make("pre", null, code));
        continue;
      }

      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        var level = Math.min(6, heading[1].length + (settings.headingOffset || 0));
        var headingNode = make("h" + level);
        appendInline(headingNode, heading[2]);
        container.appendChild(headingNode);
        i += 1;
        continue;
      }

      if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3}/.test(lines[i + 1])) {
        var rows = [tableCells(line)];
        i += 2;
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(tableCells(lines[i])); i += 1; }
        var table = make("table");
        var thead = make("thead");
        var headerRow = make("tr");
        rows[0].forEach(function (cell) {
          var th = make("th");
          appendInline(th, cell);
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        var tbody = make("tbody");
        rows.slice(1).forEach(function (row) {
          var tr = make("tr");
          row.forEach(function (cell) {
            var td = make("td");
            appendInline(td, cell);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(make("div", {
          className: "table-scroll",
          tabindex: "0",
          role: "region",
          "aria-label": "可横向滚动的报告表格"
        }, table));
        continue;
      }

      var quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        var blockquote = make("blockquote");
        appendInline(blockquote, quote[1]);
        container.appendChild(blockquote);
        i += 1;
        continue;
      }

      var unordered = line.match(/^[-*]\s+(.+)$/);
      var ordered = line.match(/^\d+\.\s+(.+)$/);
      if (unordered || ordered) {
        var list = make(ordered ? "ol" : "ul");
        var pattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
        while (i < lines.length) {
          var match = lines[i].match(pattern);
          if (!match) break;
          var item = make("li");
          appendInline(item, match[1]);
          list.appendChild(item);
          i += 1;
        }
        container.appendChild(list);
        continue;
      }

      var paragraphs = [line.trim()];
      i += 1;
      while (i < lines.length && !structural(lines[i], lines[i + 1])) {
        paragraphs.push(lines[i].trim());
        i += 1;
      }
      var paragraph = make("p");
      appendInline(paragraph, paragraphs.join(" "));
      container.appendChild(paragraph);
    }
    return container;
  }

  function badge(text, className) {
    return make("span", { className: "badge " + (className || ""), text: text });
  }

  function severityClass(severity) {
    return "badge-" + String(severity || "").toLowerCase();
  }

  function confidenceClass(confidence) {
    if (confidence === "已验证事实") return "badge-verified";
    if (confidence === "高置信推断") return "badge-inference";
    return "badge-pending";
  }

  function pageHeader(id, eyebrow, title, description, metaItems) {
    var copy = make("div",
      null,
      make("p", { className: "eyebrow", text: eyebrow }),
      make("h1", { id: id, text: title }),
      make("p", { text: description })
    );
    var header = make("header", { className: "page-header" }, copy);
    if (metaItems && metaItems.length) {
      var dl = make("dl", { className: "header-meta" });
      metaItems.forEach(function (item) {
        dl.appendChild(make("dt", { text: item[0] }));
        dl.appendChild(make("dd", { text: item[1] }));
      });
      header.appendChild(dl);
    }
    return header;
  }

  function metric(value, label) {
    return make("div", { className: "metric" },
      make("strong", { text: String(value) }),
      make("span", { text: label })
    );
  }

  function severityCounts() {
    return data.findings.reduce(function (acc, finding) {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, { Critical: 0, High: 0, Medium: 0, Low: 0 });
  }

  function renderIntegrityList() {
    var list = make("ul", { className: "integrity-list" });
    [
      ["Markdown 字符", data.integrity.markdownChars],
      ["一级章节", data.integrity.topLevelSections],
      ["Findings", data.integrity.findings],
      ["Roadmap 72h", data.integrity.roadmap72h],
      ["Roadmap 两周", data.integrity.roadmap2w],
      ["Roadmap 一个月", data.integrity.roadmap1m],
      ["Stop Doing", data.integrity.stopDoing],
      ["Next Tasks", data.integrity.nextCodexTasks],
      ["显式证据路径", data.integrity.explicitFilePaths]
    ].forEach(function (item) {
      list.appendChild(make("li", null, make("span", { text: item[0] }), make("b", { text: String(item[1]) })));
    });
    return list;
  }

  function runtimeIntegrityPassed() {
    var raw = qs("#raw-report-source");
    return data.reportMarkdown.length === data.integrity.markdownChars &&
      data.sections.length === data.integrity.topLevelSections &&
      data.findings.length === data.integrity.findings &&
      data.roadmap["72 小时"].length === data.integrity.roadmap72h &&
      data.roadmap["两周"].length === data.integrity.roadmap2w &&
      data.roadmap["一个月"].length === data.integrity.roadmap1m &&
      data.stopDoing.length === data.integrity.stopDoing &&
      data.nextTasks.length === data.integrity.nextCodexTasks &&
      Boolean(raw) && raw.textContent.length === data.reportMarkdown.length;
  }

  function renderOverview() {
    var panel = qs("#page-overview");
    clear(panel);
    var counts = severityCounts();
    panel.appendChild(pageHeader("overview-title", "Independent repository audit", "Kotomachi Audit",
      data.meta.subtitle, [["分支 / HEAD", data.meta.branch + " / " + data.meta.commit], ["产品阶段", data.meta.stage]]));

    var judgment = make("article", { className: "judgment-panel" },
      make("div", { className: "badge-row" },
        badge("Product stage · " + data.meta.stage),
        badge("Audit confidence · 高", "badge-verified"),
        badge("Highest severity · Critical", "badge-critical")
      ),
      make("h2", { text: data.meta.overallJudgment }),
      make("p", { text: data.meta.largestAdvantage }),
      make("div", { className: "judgment-risk" },
        make("strong", { text: "最大风险" }),
        make("p", { text: data.meta.largestRisk })
      )
    );
    var priority = make("aside", { className: "priority-panel" },
      make("h2", { text: "Main strategic priority" }),
      make("p", { text: data.meta.strategicPriority }),
      make("p", { className: "source-note", text: "下一步：" + data.meta.nextStep })
    );
    panel.appendChild(make("div", { className: "hero-judgment" }, judgment, priority));
    panel.appendChild(make("div", { className: "metric-strip" },
      metric(data.findings.length, "Top Findings"),
      metric(counts.Critical, "Critical"),
      metric(counts.High, "High"),
      metric(data.integrity.topLevelSections, "报告一级章节"),
      metric(data.integrity.explicitFilePaths, "显式文件证据路径")
    ));

    var severityPanel = make("section", { className: "section-panel" }, make("h2", { text: "严重度分布" }));
    var severityList = make("ul", { className: "severity-list" });
    ["Critical", "High", "Medium", "Low"].forEach(function (level) {
      var fill = make("i");
      fill.style.width = ((counts[level] / data.findings.length) * 100) + "%";
      fill.style.backgroundColor = "var(--" + level.toLowerCase() + ")";
      severityList.appendChild(make("li", { className: "severity-row" },
        make("span", { text: level }),
        make("span", { className: "severity-bar" }, fill),
        make("b", { text: String(counts[level]) })
      ));
    });
    severityPanel.appendChild(severityList);
    severityPanel.appendChild(make("p", { className: "source-note", text: "来自原报告 F1–F15 的严重度字段，不代表真实事故率。" }));

    var strengths = make("section", { className: "section-panel" }, make("h2", { text: "应继续保留与加深" }));
    var strengthList = make("ul", { className: "strength-list" });
    data.overview.strengths.forEach(function (item) { strengthList.appendChild(make("li", { text: item })); });
    strengths.appendChild(strengthList);
    panel.appendChild(make("div", { className: "dashboard-grid" }, severityPanel, strengths));

    panel.appendChild(make("section", { className: "stop-zone" },
      make("h2", { text: "现在最不应该做" }),
      make("p", { text: data.meta.stopNow }),
      make("p", { className: "source-note", text: "完整 12 项 Stop Doing 可在 Roadmap 页面查看。" })
    ));

    var status = runtimeIntegrityPassed() ? "通过" : "待确认";
    panel.appendChild(make("section", { className: "integrity-panel", id: "report-integrity" },
      make("div", { className: "integrity-status" },
        make("div", null, make("p", { className: "eyebrow", text: "Report integrity" }), make("h2", { text: "结构化索引与完整原文双重保留" })),
        make("strong", { text: status })
      ),
      make("p", { text: "嵌入的 Markdown 与源报告字符数一致；语义化阅读会去除 Markdown 标记，但“原始 Markdown”视图逐字符保留。" }),
      renderIntegrityList()
    ));
  }

  function field(title, content, full) {
    var node = make("section", { className: "finding-field" + (full ? " full" : "") }, make("h3", { text: title }));
    node.appendChild(content instanceof Node ? content : make("p", { text: content || "原报告未单列。" }));
    return node;
  }

  function pathList(paths) {
    if (!paths || !paths.length) return make("p", { text: "原报告未在该 Finding 中链接具体路径。" });
    var list = make("div", { className: "path-list" });
    paths.forEach(function (path) {
      list.appendChild(make("div", { className: "path-row" },
        make("code", { text: path }),
        make("button", {
          type: "button",
          className: "button button-secondary copy-path",
          text: "复制",
          dataset: { copyPath: path },
          "aria-label": "复制文件路径 " + path
        })
      ));
    });
    return list;
  }

  function findingCard(finding) {
    var detail = make("details", {
      className: "finding-card",
      id: "finding-" + finding.id,
      dataset: { severity: finding.severity, findingId: finding.id }
    });
    var lead = make("div",
      null,
      make("div", { className: "finding-titleline" },
        make("span", { className: "finding-id", text: finding.id }),
        make("h2", { text: finding.title })
      ),
      make("p", { className: "finding-summary", text: plainMarkdown(finding.userImpact || finding.finding).slice(0, 170) }),
      make("div", { className: "finding-badges" },
        badge(finding.severity, severityClass(finding.severity)),
        badge(finding.domain),
        badge(finding.confidence, confidenceClass(finding.confidence)),
        finding.status === "待确认" ? badge("含待确认项", "badge-pending") : null
      )
    );
    detail.appendChild(make("summary", null,
      lead,
      make("div", { className: "finding-cost" },
        make("span", { text: "实施成本" }),
        make("strong", { text: finding.implementationCost })
      )
    ));

    var grid = make("div", { className: "finding-field-grid" });
    grid.appendChild(field("发现与证据", plainMarkdown(finding.evidence), true));
    grid.appendChild(field("文件路径 / 代码引用", pathList(finding.filePaths), true));
    grid.appendChild(field("影响对象", finding.affectedUsers));
    grid.appendChild(field("用户后果", finding.userImpact));
    grid.appendChild(field("工程影响", finding.engineeringImpact));
    grid.appendChild(field("根因", finding.rootCause));
    grid.appendChild(field("建议", finding.recommendation, true));
    grid.appendChild(field("实施成本", finding.implementationCost));
    grid.appendChild(field("回归风险", finding.regressionRisk));
    grid.appendChild(field("依赖项", finding.dependencies));
    grid.appendChild(field("置信度 / 状态", finding.confidence + " / " + finding.status));
    grid.appendChild(field("时间范围", finding.timeHorizon));
    grid.appendChild(field("相关 Findings", finding.relatedFindings.length ? finding.relatedFindings.join("、") : "原报告未直接映射。"));

    var original = make("details", { className: "original-finding" },
      make("summary", { text: "查看该 Finding 的原始完整表述" }),
      renderMarkdown(finding.originalText, { headingOffset: 1 })
    );
    detail.appendChild(make("div", { className: "finding-detail" }, grid, original));
    return detail;
  }

  function option(value, label) {
    return make("option", { value: value, text: label || value });
  }

  function renderFindings() {
    var panel = qs("#page-findings");
    clear(panel);
    panel.appendChild(pageHeader("findings-title", "Core evidence", "Findings",
      "15 项核心发现，可按严重度、领域、置信度、成本与关键词定位。",
      [["最高严重度", "Critical"], ["内容来源", "Top Findings 原文"]]));

    var toolbar = make("section", { className: "findings-toolbar", "aria-label": "Finding 筛选" });
    var filterGrid = make("div", { className: "filter-grid" });
    var searchInput = make("input", { id: "finding-search", type: "search", placeholder: "搜索标题、原文、路径、根因、建议…" });
    var severity = make("select", { id: "filter-severity" }, option("", "全部严重度"));
    ["Critical", "High", "Medium", "Low"].forEach(function (value) { severity.appendChild(option(value)); });
    var domain = make("select", { id: "filter-domain" }, option("", "全部领域"));
    Array.from(new Set(data.findings.map(function (finding) { return finding.domain; }))).sort().forEach(function (value) {
      domain.appendChild(option(value));
    });
    var confidence = make("select", { id: "filter-confidence" }, option("", "全部置信度"));
    ["已验证事实", "高置信推断", "待确认"].forEach(function (value) { confidence.appendChild(option(value)); });
    var cost = make("select", { id: "filter-cost" }, option("", "全部成本"));
    Array.from(new Set(data.findings.map(function (finding) { return finding.implementationCost; }))).sort().forEach(function (value) {
      cost.appendChild(option(value));
    });

    function filterControl(label, id, control, extraClass) {
      return make("div", { className: "filter-control " + (extraClass || "") }, make("label", { for: id, text: label }), control);
    }
    filterGrid.appendChild(filterControl("关键词", "finding-search", searchInput));
    filterGrid.appendChild(filterControl("严重度", "filter-severity", severity));
    filterGrid.appendChild(filterControl("领域", "filter-domain", domain));
    filterGrid.appendChild(filterControl("置信度", "filter-confidence", confidence));
    filterGrid.appendChild(filterControl("实施成本", "filter-cost", cost));
    filterGrid.appendChild(make("button", { type: "button", className: "button button-secondary", id: "clear-finding-filters", text: "清除筛选" }));
    toolbar.appendChild(filterGrid);
    toolbar.appendChild(make("div", { className: "finding-actions" },
      make("span", { className: "result-count", id: "finding-result-count" }),
      make("button", { type: "button", className: "button button-secondary", id: "expand-findings", text: "全部展开" }),
      make("button", { type: "button", className: "button button-secondary", id: "collapse-findings", text: "全部折叠" })
    ));
    panel.appendChild(toolbar);
    panel.appendChild(make("div", { className: "findings-list", id: "findings-list" }));

    function applyFilters() {
      var query = searchInput.value.trim().toLocaleLowerCase();
      var filtered = data.findings.filter(function (finding) {
        var haystack = [finding.id, finding.title, finding.domain, finding.severity, finding.confidence,
          finding.originalText, finding.rootCause, finding.recommendation, finding.userImpact,
          finding.filePaths.join(" ")].join(" ").toLocaleLowerCase();
        return (!query || haystack.indexOf(query) >= 0) &&
          (!severity.value || finding.severity === severity.value) &&
          (!domain.value || finding.domain === domain.value) &&
          (!confidence.value || finding.confidence === confidence.value || finding.status === confidence.value) &&
          (!cost.value || finding.implementationCost === cost.value);
      }).sort(function (a, b) {
        return severityOrder[a.severity] - severityOrder[b.severity] || a.number - b.number;
      });
      var list = qs("#findings-list");
      clear(list);
      filtered.forEach(function (finding) { list.appendChild(findingCard(finding)); });
      if (!filtered.length) list.appendChild(make("div", { className: "empty-state", text: "没有符合当前条件的 Finding。" }));
      qs("#finding-result-count").textContent = "显示 " + filtered.length + " / " + data.findings.length + " 项";
    }

    [searchInput, severity, domain, confidence, cost].forEach(function (control) {
      control.addEventListener(control.tagName === "INPUT" ? "input" : "change", applyFilters);
    });
    qs("#clear-finding-filters").addEventListener("click", function () {
      searchInput.value = "";
      severity.value = "";
      domain.value = "";
      confidence.value = "";
      cost.value = "";
      applyFilters();
      searchInput.focus();
    });
    qs("#expand-findings").addEventListener("click", function () {
      qsa(".finding-card", qs("#findings-list")).forEach(function (card) { card.open = true; });
    });
    qs("#collapse-findings").addEventListener("click", function () {
      qsa(".finding-card", qs("#findings-list")).forEach(function (card) { card.open = false; });
    });
    applyFilters();
  }

  function renderSystemMap() {
    var panel = qs("#page-system-map");
    clear(panel);
    panel.appendChild(pageHeader("system-map-title", "Verified system path", "System Map",
      "只重述原报告已经验证的主消息链与学习工具分支，不补充仓库外推断。",
      [["主链节点", String(data.systemMap.primaryFlow.length)], ["证据章节", "2.3 核心调用链"]]));
    var flow = make("section", { className: "flow-panel" }, make("h2", { text: "用户消息的生产调用链" }));
    var ordered = make("ol", { className: "flow-list" });
    data.systemMap.primaryFlow.forEach(function (step) { ordered.appendChild(make("li", { text: step })); });
    flow.appendChild(ordered);
    flow.appendChild(make("h2", { text: "学习工具旁路" }));
    var learning = make("ul", { className: "learning-flow" });
    data.systemMap.learningBranch.forEach(function (step) { learning.appendChild(make("li", { text: step })); });
    flow.appendChild(learning);
    flow.appendChild(make("p", { className: "source-note", text: "关系来自原报告 Mermaid 与紧随其后的生产消息数组；结构化图不新增节点。" }));
    panel.appendChild(flow);
    panel.appendChild(make("section", { className: "document-panel" }, renderMarkdown(data.systemMap.sourceMarkdown)));
  }

  function renderJourneys() {
    var panel = qs("#page-journeys");
    clear(panel);
    panel.appendChild(pageHeader("journeys-title", "Experience paths", "User Journeys",
      "按原报告路径查看有效设计、关键断点与判断；运行态未知仍保持为未知。",
      [["覆盖旅程", String(data.journeys.length)], ["证据章节", "4.1–4.6"]]));

    var tabs = make("div", { className: "tab-list", role: "tablist", "aria-label": "用户旅程选择" });
    var content = make("div", { id: "journey-content" });
    data.journeys.forEach(function (journey, index) {
      tabs.appendChild(make("button", {
        type: "button",
        className: "tab-button",
        role: "tab",
        id: "journey-tab-" + journey.id,
        "aria-controls": "journey-panel-" + journey.id,
        "aria-selected": index === 0 ? "true" : "false",
        tabindex: index === 0 ? "0" : "-1",
        dataset: { journey: journey.id },
        text: journey.label
      }));
    });
    panel.appendChild(tabs);
    panel.appendChild(content);

    function showJourney(id) {
      var journey = data.journeys.find(function (item) { return item.id === id; }) || data.journeys[0];
      qsa(".tab-button", tabs).forEach(function (button) {
        var active = button.dataset.journey === journey.id;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
      clear(content);
      content.appendChild(make("section", {
        className: "journey-panel",
        id: "journey-panel-" + journey.id,
        role: "tabpanel",
        "aria-labelledby": "journey-tab-" + journey.id
      },
        make("aside", { className: "journey-context" },
          make("strong", { text: journey.label }),
          make("p", { text: "完整保留原报告该旅程的有效设计、断点和最终判断。" })
        ),
        make("article", { className: "document-panel" }, renderMarkdown(journey.markdown))
      ));
    }

    tabs.addEventListener("click", function (event) {
      var button = event.target.closest("[data-journey]");
      if (button) showJourney(button.dataset.journey);
    });
    tabs.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      var buttons = qsa(".tab-button", tabs);
      var current = buttons.indexOf(document.activeElement);
      var next = event.key === "ArrowRight" ? current + 1 : current - 1;
      if (next < 0) next = buttons.length - 1;
      if (next >= buttons.length) next = 0;
      buttons[next].focus();
      showJourney(buttons[next].dataset.journey);
    });
    showJourney(data.journeys[0].id);
  }

  function renderDocumentPage(panelSelector, headerId, eyebrow, title, description, metaItems, markdown) {
    var panel = qs(panelSelector);
    clear(panel);
    panel.appendChild(pageHeader(headerId, eyebrow, title, description, metaItems));
    panel.appendChild(make("article", { className: "document-panel" }, renderMarkdown(markdown)));
  }

  function roadmapCard(item) {
    var detail = make("details", { className: "roadmap-card" });
    detail.appendChild(make("summary", null,
      badge(item.priority, item.priority === "P0" ? "badge-critical" : item.priority === "P1" ? "badge-high" : "badge-medium"),
      make("h3", { text: item.item })
    ));
    var dl = make("dl");
    [
      ["目的 / 用户价值", item.purposeUserValue],
      ["具体交付 / 成功标准", item.deliverableSuccess],
      ["工作量", item.effort],
      ["风险 / 前置依赖", item.riskDependencies],
      ["对应 Finding", "原报告 Roadmap 未把任务与 Finding 一一映射。"]
    ].forEach(function (row) {
      dl.appendChild(make("dt", { text: row[0] }));
      dl.appendChild(make("dd", { text: row[1] }));
    });
    detail.appendChild(make("div", { className: "roadmap-detail" }, dl));
    return detail;
  }

  function renderRoadmap() {
    var panel = qs("#page-roadmap");
    clear(panel);
    panel.appendChild(pageHeader("roadmap-title", "Sequenced action", "Roadmap",
      "严格沿用原报告的 72 小时、两周、一个月取舍，并把 Stop Doing 放在同一决策面。",
      [["计划项", String(data.integrity.roadmap72h + data.integrity.roadmap2w + data.integrity.roadmap1m)], ["停止项", String(data.stopDoing.length)]]));

    var lanes = make("div", { className: "roadmap-lanes" });
    ["72 小时", "两周", "一个月"].forEach(function (horizon) {
      var lane = make("section", { className: "roadmap-lane" },
        make("header", null,
          make("p", { className: "eyebrow", text: "Future" }),
          make("h2", { text: horizon }),
          make("p", { text: data.roadmap[horizon].length + " 项，按原报告顺序" })
        )
      );
      data.roadmap[horizon].forEach(function (item) { lane.appendChild(roadmapCard(item)); });
      lanes.appendChild(lane);
    });
    panel.appendChild(lanes);

    var stop = make("section", { className: "stop-zone" },
      make("h2", { text: "Stop Doing List" }),
      make("p", { text: "这些方向会增加复杂度、稀释定位，或在证据基础不足时制造虚假的成熟感。" })
    );
    var list = make("ol", { className: "stop-list" });
    data.stopDoing.forEach(function (item) {
      list.appendChild(make("li", { text: item.text, dataset: { number: String(item.number).padStart(2, "0") } }));
    });
    stop.appendChild(list);
    panel.appendChild(stop);
  }

  function renderFullReport() {
    var panel = qs("#page-full-report");
    clear(panel);
    panel.appendChild(pageHeader("full-report-title", "Lossless source layer", "Full Report",
      "语义化阅读视图保留全部章节、表格、证据和路径；原始 Markdown 视图逐字符保留源文件。",
      [["Markdown 字符", String(data.integrity.markdownChars)], ["一级章节", String(data.integrity.topLevelSections)]]));

    var searchInput = make("input", { id: "report-search-input", type: "search", placeholder: "输入中文、路径、Finding 或章节关键词…" });
    var toolbar = make("section", { className: "report-toolbar", "aria-label": "完整报告工具" },
      make("div", { className: "report-search" },
        make("label", { for: "report-search-input", text: "全文搜索" }),
        searchInput
      ),
      make("div", { className: "report-actions" },
        make("span", { className: "result-count", id: "report-search-status", text: "12 / 12 章节" }),
        make("button", { type: "button", className: "button button-secondary", id: "expand-report", text: "全部展开" }),
        make("button", { type: "button", className: "button button-secondary", id: "collapse-report", text: "全部折叠" }),
        make("button", { type: "button", className: "button button-secondary", id: "toggle-raw-report", text: "原始 Markdown" }),
        make("button", { type: "button", className: "button button-secondary", id: "copy-full-report", text: "复制全文" })
      )
    );
    panel.appendChild(toolbar);

    var layout = make("div", { className: "report-layout", id: "report-rendered-view" });
    var toc = make("nav", { className: "report-toc", "aria-label": "完整报告章节" });
    var reportDocument = make("article", { className: "report-document" });

    data.sections.forEach(function (section) {
      var id = "report-section-" + section.number;
      toc.appendChild(make("button", {
        type: "button",
        text: section.number + ". " + section.title,
        dataset: { reportTarget: id }
      }));
      var details = make("details", {
        className: "report-section",
        id: id,
        open: true,
        dataset: { searchText: plainMarkdown(section.markdown).toLocaleLowerCase() }
      });
      details.appendChild(make("summary", null, make("strong", { text: section.number + ". " + section.title })));
      details.appendChild(make("div", { className: "report-section-tools" },
        make("button", {
          type: "button",
          className: "button button-quiet",
          text: "复制本章",
          dataset: { copySection: String(section.number) }
        })
      ));
      details.appendChild(renderMarkdown(section.markdown.replace(/^# .*\n?/, "")));
      reportDocument.appendChild(details);
    });
    layout.appendChild(toc);
    layout.appendChild(reportDocument);
    panel.appendChild(layout);

    var rawPanel = make("section", { className: "raw-report-panel", id: "raw-report-view", hidden: true },
      make("p", { className: "source-note", text: "以下文本与 data.js 中嵌入的 Markdown 源逐字符一致，包括标题标记、表格分隔线与文件路径。" }),
      make("pre", { id: "raw-report-source", text: data.reportMarkdown })
    );
    panel.appendChild(rawPanel);

    toc.addEventListener("click", function (event) {
      var button = event.target.closest("[data-report-target]");
      if (!button) return;
      var target = document.getElementById(button.dataset.reportTarget);
      if (target) {
        target.open = true;
        target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
      }
    });

    searchInput.addEventListener("input", function () {
      var query = searchInput.value.trim().toLocaleLowerCase();
      var matched = 0;
      qsa(".report-section", reportDocument).forEach(function (section) {
        var isMatch = !query || section.dataset.searchText.indexOf(query) >= 0;
        section.hidden = !isMatch;
        section.classList.toggle("report-search-hit", Boolean(query && isMatch));
        if (isMatch) {
          matched += 1;
          if (query) section.open = true;
        }
      });
      qsa("[data-report-target]", toc).forEach(function (button) {
        var target = qs("#" + button.dataset.reportTarget);
        button.hidden = target ? target.hidden : false;
      });
      qs("#report-search-status").textContent = matched + " / " + data.sections.length + " 章节";
    });

    qs("#expand-report").addEventListener("click", function () {
      qsa(".report-section", reportDocument).forEach(function (section) { section.open = true; });
    });
    qs("#collapse-report").addEventListener("click", function () {
      qsa(".report-section", reportDocument).forEach(function (section) { section.open = false; });
    });
    qs("#toggle-raw-report").addEventListener("click", function (event) {
      var showRaw = rawPanel.hidden;
      rawPanel.hidden = !showRaw;
      layout.hidden = showRaw;
      event.currentTarget.textContent = showRaw ? "渲染阅读" : "原始 Markdown";
    });
    qs("#copy-full-report").addEventListener("click", function () {
      copyText(data.reportMarkdown, "完整报告已复制");
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        var visible = entries.filter(function (entry) { return entry.isIntersecting; }).sort(function (a, b) {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        })[0];
        if (!visible) return;
        qsa("[data-report-target]", toc).forEach(function (button) {
          button.classList.toggle("is-active", button.dataset.reportTarget === visible.target.id);
        });
      }, { rootMargin: "-15% 0px -70% 0px", threshold: 0 });
      qsa(".report-section", reportDocument).forEach(function (section) { observer.observe(section); });
    }
  }

  function renderFlagship() {
    renderDocumentPage("#page-flagship", "flagship-title", "Autumn recruitment case", "Flagship Case",
      "把未来 1–2 个月的项目写成待验证案例，而不是把尚未完成的成果包装成既有结果。",
      [["叙事步骤", "问题 → 局限"], ["证据状态", "未来交付，尚未完成"]], data.flagshipMarkdown);
  }

  function renderAll() {
    renderFullReport();
    renderOverview();
    renderFindings();
    renderSystemMap();
    renderJourneys();
    renderDocumentPage("#page-eval-data", "eval-data-title", "Quality governance", "Eval & Data",
      "自动指标、LLM Judge、人工评审、真实用户行为、Bad Case 与 Regression 的最小落地蓝图。",
      [["评测章节", "6.1–6.7"], ["真实转化率", "未提供，不虚构"]], data.evalDataMarkdown);
    renderDocumentPage("#page-engineering", "engineering-title", "Risk and effort", "Engineering",
      "按“现在必须修 / 下个功能前修 / 可暂缓 / 不值得做”保留原报告的工程取舍。",
      [["决策层级", "4"], ["证据", "文件与代码位置"]], data.engineeringMarkdown);
    renderRoadmap();
    renderFlagship();
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function navigate(page, options) {
    var targetPage = pageLabels[page] ? page : "overview";
    activePage = targetPage;
    qsa("[data-page-panel]").forEach(function (panel) {
      var active = panel.dataset.pagePanel === targetPage;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    qsa("[data-page]").forEach(function (button) {
      var active = button.dataset.page === targetPage;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    qs("#mobile-page-label").textContent = pageLabels[targetPage];
    document.title = pageLabels[targetPage] + " · Kotomachi Audit";
    if (!options || options.updateHash !== false) {
      try { history.replaceState(null, "", "#" + targetPage); }
      catch (error) { location.hash = targetPage; }
    }
    closeMobileNav();
    closeGlobalResults();
    if (!options || options.scroll !== false) window.scrollTo({ top: 0, behavior: "auto" });
    if (options && options.focus) qs("#main-content").focus();
  }

  function openMobileNav() {
    qs("#sidebar").classList.add("is-open");
    qs(".sidebar-scrim").classList.add("is-open");
    qs(".mobile-menu-button").setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
    var active = qs(".nav-item.is-active");
    if (active) active.focus();
  }

  function closeMobileNav() {
    qs("#sidebar").classList.remove("is-open");
    qs(".sidebar-scrim").classList.remove("is-open");
    qs(".mobile-menu-button").setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  function showToast(message) {
    var toast = qs("#toast");
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 1800);
  }

  function fallbackCopy(text) {
    var textarea = make("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
    document.body.removeChild(textarea);
    return ok;
  }

  function copyText(text, successMessage) {
    var operation;
    if (navigator.clipboard && window.isSecureContext) {
      operation = navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
    } else {
      operation = Promise.resolve(fallbackCopy(text));
    }
    operation.then(function (ok) {
      showToast(ok ? successMessage : "浏览器阻止了复制，请手动选择文本");
    });
  }

  function applyTheme(theme, persist) {
    var resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
    qsa(".theme-toggle").forEach(function (button) {
      button.setAttribute("aria-label", "切换到" + (resolved === "dark" ? "浅色" : "深色") + "主题");
      if (button.classList.contains("button-secondary")) button.textContent = resolved === "dark" ? "切换浅色" : "切换深色";
    });
    if (persist) {
      try { localStorage.setItem("kotomachi-audit-theme", resolved); } catch (error) { /* storage may be disabled */ }
    }
  }

  function initializeTheme() {
    var stored = null;
    try { stored = localStorage.getItem("kotomachi-audit-theme"); } catch (error) { stored = null; }
    var preferred = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(stored || preferred, false);
    qsa(".theme-toggle").forEach(function (button) {
      button.addEventListener("click", function () {
        applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
      });
    });
  }

  function globalSearchRecords() {
    var records = [];
    data.findings.forEach(function (finding) {
      records.push({
        type: "Finding",
        title: finding.id + " · " + finding.title,
        subtitle: finding.severity + " · " + finding.domain,
        page: "findings",
        target: "finding-" + finding.id,
        text: [finding.originalText, finding.filePaths.join(" "), finding.rootCause, finding.recommendation].join(" ")
      });
    });
    Object.keys(data.roadmap).forEach(function (horizon) {
      data.roadmap[horizon].forEach(function (item) {
        records.push({
          type: "Roadmap",
          title: horizon + " · " + item.item,
          subtitle: item.priority + " · " + item.effort,
          page: "roadmap",
          target: "",
          text: [item.purposeUserValue, item.deliverableSuccess, item.riskDependencies].join(" ")
        });
      });
    });
    data.sections.forEach(function (section) {
      records.push({
        type: "完整报告",
        title: section.number + ". " + section.title,
        subtitle: "原始章节",
        page: "full-report",
        target: "report-section-" + section.number,
        text: section.markdown
      });
    });
    return records;
  }

  function closeGlobalResults() {
    var results = qs("#global-search-results");
    if (results) results.hidden = true;
  }

  function initializeGlobalSearch() {
    var input = qs("#global-search-input");
    var results = qs("#global-search-results");
    var records = globalSearchRecords();

    input.addEventListener("input", function () {
      var query = input.value.trim().toLocaleLowerCase();
      clear(results);
      if (query.length < 2) {
        results.hidden = true;
        return;
      }
      var matches = records.filter(function (record) {
        return [record.title, record.subtitle, record.text].join(" ").toLocaleLowerCase().indexOf(query) >= 0;
      }).slice(0, 14);
      if (!matches.length) {
        results.appendChild(make("p", { className: "search-empty", text: "没有找到匹配内容。" }));
      } else {
        matches.forEach(function (record) {
          results.appendChild(make("button", {
            type: "button",
            className: "search-result",
            dataset: { searchPage: record.page, searchTarget: record.target || "" }
          }, make("strong", { text: record.title }), make("span", { text: record.type + " · " + record.subtitle })));
        });
      }
      results.hidden = false;
    });

    results.addEventListener("click", function (event) {
      var button = event.target.closest("[data-search-page]");
      if (!button) return;
      navigate(button.dataset.searchPage, { focus: false });
      var targetId = button.dataset.searchTarget;
      if (button.dataset.searchPage === "findings" && targetId) {
        qs("#finding-search").value = "";
        qs("#filter-severity").value = "";
        qs("#filter-domain").value = "";
        qs("#filter-confidence").value = "";
        qs("#filter-cost").value = "";
        qs("#finding-search").dispatchEvent(new Event("input"));
      }
      window.setTimeout(function () {
        var target = targetId ? document.getElementById(targetId) : null;
        if (target) {
          if (target.tagName === "DETAILS") target.open = true;
          target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
          if (typeof target.focus === "function") target.focus({ preventScroll: true });
        }
      }, 0);
      input.value = "";
      closeGlobalResults();
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".global-search")) closeGlobalResults();
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        input.value = "";
        closeGlobalResults();
      }
    });
  }

  function initializeDelegatedActions() {
    document.addEventListener("click", function (event) {
      var copyButton = event.target.closest("[data-copy-path]");
      if (copyButton) {
        copyText(copyButton.dataset.copyPath, "文件路径已复制");
        return;
      }
      var sectionButton = event.target.closest("[data-copy-section]");
      if (sectionButton) {
        var number = Number(sectionButton.dataset.copySection);
        var section = data.sections.find(function (item) { return item.number === number; });
        if (section) copyText(section.markdown, "第 " + number + " 章已复制");
      }
    });
  }

  function initializeNavigation() {
    qsa("[data-page]").forEach(function (button) {
      button.addEventListener("click", function () { navigate(button.dataset.page, { focus: true }); });
    });
    qsa("[data-page-link]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        navigate(link.dataset.pageLink, { focus: true });
      });
    });
    qs(".mobile-menu-button").addEventListener("click", function () {
      if (qs("#sidebar").classList.contains("is-open")) closeMobileNav();
      else openMobileNav();
    });
    qs(".sidebar-scrim").addEventListener("click", closeMobileNav);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileNav();
        closeGlobalResults();
      }
    });
    window.addEventListener("hashchange", function () {
      var hash = location.hash.replace(/^#/, "");
      if (pageLabels[hash] && hash !== activePage) navigate(hash, { updateHash: false, focus: false });
    });
  }

  function initializeBackToTop() {
    var button = qs(".back-to-top");
    window.addEventListener("scroll", function () { button.hidden = window.scrollY < 650; }, { passive: true });
    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    });
  }

  function showFatalError(message) {
    var main = qs("#main-content");
    clear(main);
    main.appendChild(make("section", { className: "empty-state" },
      make("h1", { text: "审计工作台无法初始化" }),
      make("p", { text: message })
    ));
  }

  function initialize() {
    if (!data || !data.reportMarkdown) {
      showFatalError("data.js 未正确加载。请确认 index.html、data.js 与 app.js 位于同一目录。");
      return;
    }
    renderAll();
    initializeTheme();
    initializeNavigation();
    initializeGlobalSearch();
    initializeDelegatedActions();
    initializeBackToTop();
    var initial = location.hash.replace(/^#/, "");
    navigate(pageLabels[initial] ? initial : "overview", { updateHash: false, scroll: false });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
