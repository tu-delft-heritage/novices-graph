
// var data_men = d3.csv("male_at_tu.csv", function(data){
//         console.log(data)
// });
// var data_fem = d3.csv("female_at_tu.csv", function(data){
//         console.log(data)
// });

// var data_men1;
// d3.json("male_at_tu.json").then(async function(data){
        
//         data_men1 = await data
// });

// var data_fem1;
// d3.json("female_at_tu.json").then(async function(data){
//         data_fem1 = await data
// });

var import_data;
Promise.all([
        d3.json("male_at_tu.json"),
        d3.json("female_at_tu.json")
]).then(async function(data){
        // console.log(data[0])
        // console.log(data[1])
        // data_men = data[0]
        // data_fem = data[1]
        import_data = await data
});

// function fetch() {
//   let data_fetched;
//   Promise.all([
//       d3.json("male_at_tu.json"),
//       d3.json("female_at_tu.json")
//   ]).then(async function(data){
//       data_fetched = await data
//   });
//   return data_fetched
// };



function graphing() {
  // import_data = fetch();
  data_graph(import_data[0], import_data[1], "Totaal");
};

function data_graph(data_men, data_fem, param) {

  var options = {
          series: [{
          name: 'Men',
          data: Object.values(data_men[param]),
        }, {
          name: 'Female',
          data: Object.values(data_fem[param]),
        }], 
          chart: {
          type: 'bar',
          height: 350
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
            endingShape: 'rounded',
          },
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          show: true,
          width: 2,
          colors: ['transparent'],
        },
        xaxis: {
          categories: Object.keys(data_men[param]),
        },
        yaxis: {
          title: {
            text: 'Amount of students',
          }
        },
        fill: {
          opacity: 1
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return val + " students"
            }
          }
        }
        };

        var chart = new ApexCharts(document.querySelector("#plot"), options);
        chart.render();

};

