var import_data;
Promise.all([
        d3.json("male_at_tu.json"),
        d3.json("female_at_tu.json")
]).then(async function(data){

        import_data = await data;
        var elmts = Object.keys(import_data[0]);
        var select = document.getElementById("arr");

        $.each(elmts, function(i, p) {
          $('#arr').append($('<option></option>')
            .val(p).html(p));
        });

        // var options = {
        //           series: [], 
        //           chart: {
        //           type: 'bar',
        //           height: 350
        //         },
        //         plotOptions: {
        //           bar: {
        //             horizontal: false,
        //             columnWidth: '55%',
        //             endingShape: 'rounded',
        //           },
        //         },
        //         dataLabels: {
        //           enabled: false
        //         },
        //         stroke: {
        //           show: true,
        //           width: 2,
        //           colors: ['transparent'],
        //         },
        //         xaxis: {
        //           categories: Object.keys(import_data[0]["Totaal"]),
        //         },
        //         yaxis: {
        //           title: {
        //             text: 'Amount of students',
        //           }
        //         },
        //         fill: {
        //           opacity: 1
        //         },
        //         tooltip: {
        //           y: {
        //             formatter: function (val) {
        //               return val + " students"
        //             }
        //           }
        //         }
        //         };

        // var chart = new ApexCharts(document.querySelector("#plot"), options);
        // chart.render();
        
});



function graphing() {
  var selected = document.getElementById('arr');
  var value = selected.options[selected.selectedIndex].value;
  data_graph(import_data[0], import_data[1], value);
};

function data_graph(data_men, data_fem, param) {


  // chart.updateSeries([{
  //   name: 'Men',
  //   data: Object.values(data_men[param])
  // }, {
  //   name: 'Female',
  //   data: Object.values(data_fem[param])
  //   }])

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

