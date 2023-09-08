function generateBoard(data) {
  let teamNames = data.teams;
  let correctAnswers = data.answers;
  let N = Object.keys(data.answers).length;

  // team -> question -> answers
  let answers = {};

  for (let team = 0; team < teamNames.length; team++) {
    answers[team] = {};
    for (let question = 1; question <= N; question++) {
      answers[team][question] = [];
    }
  }

  for (let row of data.submissions) {
    if (!answers[row.team]) {
      console.error('Invalid team', row);
      continue;
    }
    if (!answers[row.team][row.question]) {
      console.error('Invalid question', row);
      continue;
    }
    answers[row.team][row.question].push({ from: Number(row.from), to: Number(row.to) });
  }

  // isCorrect === true  then result is result
  // isCorrect === false then result is number of failures
  function questionScore(question, answers) {
    function isRight(answer) {
      let correctAnswer = correctAnswers[question];
      if (correctAnswer === undefined) return false;
      return (answer.from <= correctAnswer && correctAnswer <= answer.to);
    }

    let result = 0;
    let isCorrect = false;
    for (let answer of answers) {
      if (isRight(answer)) {
        result = Math.floor(answer.to / answer.from);
        if (result < 0) {
          result = Infinity;
        }
        isCorrect = true;
      } else {
        if (!isCorrect) {
          result++;
        } else {
          result = 1;
        }
        isCorrect = false;
      }
    }
    return { isCorrect, result };
  }

  function teamScore(teamAnswers) {
    let sum = 10;
    let numberOfGoodOnes = 0;
    for (let question = 1; question <= N; question++) {
      let { isCorrect, result } = questionScore(question, teamAnswers[question]);
      if (isCorrect) {
        numberOfGoodOnes++;
        sum += result;
      }
    }
    return sum * Math.pow(2, N - numberOfGoodOnes);
  }

  function row(teamAnswers) {
    let tds = [];
    for (let question = 1; question <= N; question++) {
      let answers = teamAnswers[question];
      if (answers.length === 0) {
        tds.push('');
      } else {
        let { isCorrect, result } = questionScore(question, answers);
        if (isCorrect) {
          tds.push(result);
        } else {
          let xs = '';
          for (let i = 0; i < result; i++) {
            xs += 'X';
          }
          tds.push('<span style="color:red">' + xs + '</span>');
        }
      }
    }
    tds.push(teamScore(teamAnswers));
    return tds;
  }

  let header = ['Team'];
  for (let question = 1; question <= N; question++) {
    header.push(question);
  }
  header.push('Score');
  thead = '<thead class="thead-inverse text-center"><tr>' + header.map(x => { return '<th>' + x + '</th>' }).join('') + '</tr></thead>';

  let trs = [];
  for (let team = 0; team < teamNames.length; team++) {
    let teamAnswers = answers[team];
    let tds = [`<small class="text-body-secondary fw-normal">${team + 1}</small>&emsp;${teamNames[team]}`].concat(row(teamAnswers)).map(x => { return '<td>' + x + '</td>' });
    trs.push(tds);
  }

  return (`
    <table class="table table-bordered table-striped">${thead}</thead><tbody>${trs.map(tr => { return '<tr>' + tr.join('') + '</tr>' }).join('')}</tbody></table>
  `);
}

function getData(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('get', '/log', true);
  xhr.onreadystatechange = function () {
    var status;
    if (xhr.readyState == 4) { // `DONE`
      status = xhr.status;
      if (status == 200) {
        callback(null, JSON.parse(xhr.responseText))
      } else {
        callback({ error: 'Couldn\'t get response from server', status: status });
      }
    }
  };
  xhr.send();
}

var last_data = {};

function updateData(no_loop) {
  let table = document.getElementById('table');
  let error = document.getElementById('error');
  getData(function (err, json) {
    if (no_loop === undefined) {
      setTimeout(updateData, 1000);
    }
    if (err) {
      error.innerHTML = 'Error ' + JSON.stringify(err);
      return;
    }
    error.innerHTML = '';
    last_data = json;
    table.innerHTML = generateBoard(json);
    function judge(sub) {
      let correct = json.answers[sub.question];
      if (correct === undefined) return "Unknown question";
      let from = Number(sub.from);
      let to = Number(sub.to);
      if (from <= correct && correct <= to) {
        return "OK " + Math.floor(to / from);
      } else {
        return "WRONG";
      }
    }
    $("#tbody-submissions").html($.map(json.submissions, sub => `<tr>
          <td>${new Date(sub.date).toLocaleString()}</td>
          <td>${json.teams[sub.team]}</td>
          <td>${sub.question}</td>
          <td>${sub.from}</td>
          <td>${sub.to}</td>
          <td>${judge(sub)}</td>
          <td><button class="btn-remove btn btn-outline-danger btn-sm lh-sm"
            data-date="${sub.date}" data-desc="${json.teams[sub.team]} Q${sub.question}">remove</button></td>
        </tr>`)
      .reverse().join());
  });
}

function timer() {
  let total = 60 * 30;
  let left = Math.min(localStorage.timer || total, total); // if total was changed down
  let interval = null;

  function render() {
    let specialEnd = 60; // last minute is special
    let minSize = 30;
    let increment = 60;
    let node = document.getElementById('js-timer-html');

    function padfloor(n) {
      n = Math.floor(n);
      if (n < 10) {
        return '0' + n;
      } else {
        return n;
      }
    }
    if (left > specialEnd) {
      node.innerHTML = padfloor(left / 60) + ':' + padfloor(left % 60);
    } else {
      node.innerHTML = left;
    }

    let howClose = (total - left) / total; // 0 at start, 1 at end
    node.style.fontSize = (minSize + howClose * increment) + 'px';
    node.style.color = 'rgb(' + Math.round(howClose * 256) + ',0,0)';
    node.style.lineHeight = node.style.height = (minSize + increment) + 'px';

    let rotate = 0;
    if (left <= specialEnd) {
      let howClose = (specialEnd - left) / specialEnd;
      rotate = -howClose * 360;
    }
    node.style.transform = 'rotate(' + rotate + 'deg)';
  }
  function setLeft(n) {
    if (n >= 0) {
      left = n;
      localStorage.timer = n;
      render();
    }
  }
  function tick() {
    setLeft(left - 1);
  }
  function start() {
    // It's more pleasant UI if we tick right away
    tick();
    clearInterval(interval);
    interval = setInterval(tick, 1000);
  }
  function stop() {
    clearInterval(interval);
  }
  function restart() {
    setLeft(total);
  }
  render();

  document.getElementById('js-timer-start').onclick = start;
  document.getElementById('js-timer-stop').onclick = stop;
  document.getElementById('js-timer-restart').onclick = restart;
}

function parseSubmission(strSubmission) {
  let split = strSubmission.split(/\s+/).filter(Boolean);
  let msg = "";

  if (split.length <= 0) {
    return [undefined, msg + "&gt; Team ID"];
  }
  let teamId = parseInt(split[0]) - 1;
  if (last_data.teams[teamId] === undefined) {
    return [undefined, msg + "Invalid Team ID " + split[0]];
  } else {
    msg += last_data.teams[teamId] + "&emsp;"
  }

  if (split.length <= 1) {
    return [undefined, msg + "&gt; Question ID"];
  }
  let qId = split[1];
  if (last_data.answers[qId] === undefined) {
    return [undefined, msg + "Invalid Question ID " + split[1]];
  } else {
    msg += "Q[" + split[1] + "]&emsp;";
  }

  if (split.length <= 2) {
    return [undefined, msg + "&gt; Lower bound"];
  }
  let lower_bound = Number(split[2]);
  if (isNaN(lower_bound)) {
    return [undefined, msg + "Invalid Lower Bound " + split[2]];
  } else {
    msg += "LB[" + lower_bound + "]&emsp;";
  }

  if (split.length <= 3) {
    return [undefined, msg + "&gt; Upper bound"];
  }
  let upper_bound = Number(split[3]);
  if (isNaN(upper_bound)) {
    return [undefined, msg + "Invalid Upper Bound " + split[3]];
  } else {
    msg += "UB[" + upper_bound + "]&emsp;";
  }

  if (split.length >= 5) {
    return [undefined, msg + "Too many args!"];
  }

  console.log({ team: teamId, question: qId, from: split[2], to: split[3] });

  return [
    { team: teamId, question: qId, from: split[2], to: split[3] },
    msg
  ];
}

$(() => {
  timer();
  updateData();

  function refreshMetadata() {
    $.get("metadata", { dataType: "text" }).done(data => {
      $("#metadata-textarea").val(data);
    });
  }
  refreshMetadata();

  $("#metadata-form").on("submit", e => {
    e.preventDefault();
    $.post("metadata", { value: $("#metadata-textarea").val() }).done(_ => {
      refreshMetadata();
    }).fail(e => {
      alert("Metadata update failed (please check the input format!):\n" + e.responseText);
    });
    return false;
  });

  $new_submission = $("#new-submission");
  $new_submission.on("change paste keyup", e => {
    function setValid(msg) {
      $("#new-submission-valid").html(msg);
      $new_submission.removeClass("is-invalid");
      $new_submission.addClass("is-valid");
    }

    function setInvalid(msg) {
      $("#new-submission-invalid").html(msg);
      $new_submission.removeClass("is-valid");
      $new_submission.addClass("is-invalid");
    }

    let parsed = parseSubmission($new_submission.val());
    if (parsed[0] === undefined) {
      // error
      setInvalid(parsed[1]);
    } else {
      setValid(parsed[1]);
    }
  });

  function submit_submission() {
    let parsed = parseSubmission($new_submission.val());
    if (parsed[0] === undefined) {
      alert("Invalid new submission!")
    } else {
      $new_submission.val("");
      $.post("add", parsed[0]).fail(e => {
        alert("Unexpected failure when creating new submission:\n" + e.responseText);
      }).done(() => {
        updateData(true);
      })
    }
  }

  $("#btn-submission").on("click", e => submit_submission())
  $new_submission.on("keydown", e => {
    // Ctrl + Enter
    if ((e.ctrlKey || e.metaKey) && (e.keyCode == 13 || e.keyCode == 10)) {
      submit_submission();
    }
  })

  $new_submission.trigger("change");

  $("#tbody-submissions").on("click", ".btn-remove", e => {
    let $this = $(e.target);
    console.log("Removing " + $this.data("date") + $this.data("desc"));
    if (confirm(`Confirm removing entry ${$this.data("date")}\n\n${$this.data("desc")}`)) {
      $.post("remove", { date: $this.data("date") }).fail(e =>
        alert(`Failed to remove ${$this.data("date")}:\n\n${e.responseText}`));
    }
  });

  $("#btn-clear-all").on("click", e => {
    if (confirm("Confirm clear ALL submissions?")) {
      $.post("clearall");
    }
    return false;
  })

});
